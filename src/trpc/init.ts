import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";

import { db } from "@/db";
import { resolveAuthContext } from "@/lib/auth/auth-bypass";
import { getVerifiedUser } from "@/lib/auth/verify-jwt";
import { createClient } from "@/lib/supabase/server";
import { type OrgRole, ensureOrgForUser } from "@/server/orgs/ensure-org-for-user";

export const createTRPCContext = async ({ headers }: { headers: Headers }) => {
  void headers;
  const supabase = createClient();
  const user = await getVerifiedUser(supabase);

  const auth = resolveAuthContext(user);

  if (!auth) {
    return { userId: null, email: null, orgId: null, role: null };
  }

  // Resolves the caller's tenant, creating one on first sight. Nothing reads
  // `orgId` yet — tenant tables gain their `org_id` column in the follow-up PR —
  // but resolving it here means that PR is a stamping change, not a plumbing one.
  const org = await ensureOrgForUser(db, auth.userId);

  return {
    userId: auth.userId,
    email: auth.email,
    orgId: org.orgId,
    /**
     * Stored and exposed, checked by nothing. There is deliberately no
     * `requireRole` middleware: roles become enforcement when the Partner and
     * Member tiers actually ship, and the rules will live in
     * `src/db/tenancy.ts`'s visibility classes rather than scattered here.
     */
    role: org.role satisfies OrgRole,
  };
};

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * Logs the real cause of any failed procedure. tRPC wraps thrown errors (e.g. a
 * SQLite `NOT NULL constraint failed: …`) into a TRPCError and hides the message
 * from the client, so without this the underlying failure is invisible on the
 * server too. We log path/code/message/cause — never the raw input, which may
 * contain sensitive data (see CLAUDE.md "never log secrets").
 */
const errorLoggingMiddleware = t.middleware(async ({ path, type, next }) => {
  const result = await next();
  if (!result.ok) {
    const { error } = result;
    const cause = error.cause;
    console.error(
      `[trpc] ${type} ${path} failed: ${error.code} — ${error.message}`,
      cause instanceof Error ? { cause: cause.message, stack: cause.stack } : (cause ?? "")
    );
  }
  return result;
});

export const baseProcedure = t.procedure.use(errorLoggingMiddleware);

export const protectedProcedure = t.procedure.use(errorLoggingMiddleware).use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!ctx.orgId || !ctx.role) {
    // Unreachable via createTRPCContext (a userId always comes with an org), but
    // it keeps `orgId` non-nullable downstream so the stamping PR doesn't have to
    // null-check at every insert.
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No org resolved for user" });
  }
  return next({
    ctx: {
      userId: ctx.userId,
      email: ctx.email,
      orgId: ctx.orgId,
      role: ctx.role,
    },
  });
});
