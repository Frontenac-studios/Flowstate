import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { syncMcpTokenRow } from "@/db/record-sync-mutation";
import { mcpTokens } from "@/db/tables";
import { MINTABLE_MCP_SCOPES } from "@/lib/mcp/scopes";
import { mintMcpToken } from "@/lib/mcp/token";

import { createTRPCRouter, protectedProcedure } from "../init";

/** Live tokens a user may hold at once — one per device is the intent, ten is plenty. */
export const MAX_ACTIVE_MCP_TOKENS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Every column except the hash: nothing that authenticates ever leaves the server. */
const publicColumns = {
  id: mcpTokens.id,
  name: mcpTokens.name,
  tokenPrefix: mcpTokens.tokenPrefix,
  scopes: mcpTokens.scopes,
  lastUsedAt: mcpTokens.lastUsedAt,
  expiresAt: mcpTokens.expiresAt,
  revokedAt: mcpTokens.revokedAt,
  createdAt: mcpTokens.createdAt,
};

/**
 * MCP personal access tokens (W18b) — minted and revoked from Settings →
 * Integrations → Claude. The plaintext is returned by `create` exactly once and is
 * never readable again; `list` exposes only the display prefix.
 */
export const mcpTokensRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select(publicColumns)
      .from(mcpTokens)
      .where(eq(mcpTokens.userId, ctx.userId))
      .orderBy(desc(mcpTokens.createdAt));
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "Name the device this token is for.").max(80),
        expiresInDays: z
          .union([z.literal(30), z.literal(90), z.literal(365)])
          .nullable()
          .default(null),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [{ active } = { active: 0 }] = await db
        .select({ active: count() })
        .from(mcpTokens)
        .where(and(eq(mcpTokens.userId, ctx.userId), isNull(mcpTokens.revokedAt)));
      if (active >= MAX_ACTIVE_MCP_TOKENS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You already have ${MAX_ACTIVE_MCP_TOKENS} active tokens. Revoke one first.`,
        });
      }

      const minted = mintMcpToken();
      const now = new Date();
      const [row] = await db
        .insert(mcpTokens)
        .values({
          userId: ctx.userId,
          orgId: ctx.orgId,
          name: input.name,
          tokenHash: minted.tokenHash,
          tokenPrefix: minted.tokenPrefix,
          scopes: [...MINTABLE_MCP_SCOPES],
          expiresAt: input.expiresInDays
            ? new Date(now.getTime() + input.expiresInDays * DAY_MS)
            : null,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Couldn't create the token.",
        });
      }

      // The desktop app writes to SQLite; the hosted endpoint checks Postgres. Sync is
      // what makes a token minted offline work against the hosted URL.
      await syncMcpTokenRow(row.id, "insert", row);

      // Everything the list shows, plus the plaintext this once — never the hash.
      return {
        id: row.id,
        name: row.name,
        tokenPrefix: row.tokenPrefix,
        scopes: row.scopes,
        lastUsedAt: row.lastUsedAt,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
        createdAt: row.createdAt,
        token: minted.token,
      };
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [row] = await db
        .update(mcpTokens)
        .set({ revokedAt: now, updatedAt: now })
        .where(
          and(
            eq(mcpTokens.id, input.id),
            eq(mcpTokens.userId, ctx.userId),
            isNull(mcpTokens.revokedAt)
          )
        )
        .returning();

      if (!row) {
        // Already revoked, or not this user's: either way there is nothing to do, and
        // saying which would confirm another user's token id exists.
        return { revoked: false as const };
      }

      await syncMcpTokenRow(row.id, "update", row);
      return { revoked: true as const };
    }),
});
