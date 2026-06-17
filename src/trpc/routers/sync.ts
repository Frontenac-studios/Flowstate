import { listPendingMutations, runSync } from "@kash/sync";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { isSqliteMode } from "@/db/mode";
import { isAuthBypassed } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";

import { createTRPCRouter, protectedProcedure } from "../init";

export const syncRouter = createTRPCRouter({
  status: protectedProcedure.query(async () => {
    const mode = isSqliteMode() ? ("sqlite" as const) : ("postgres" as const);
    if (!isSqliteMode()) {
      return { mode, pendingCount: 0 };
    }

    const pending = await listPendingMutations(db as unknown as import("@kash/db-local").SqliteDb);
    return { mode, pendingCount: pending.length };
  }),

  run: protectedProcedure
    .input(z.object({ accessToken: z.string().min(1) }).optional())
    .mutation(async ({ ctx, input }) => {
      if (!isSqliteMode()) {
        return { pulled: 0, pushed: 0, errors: [] as string[], skipped: true as const };
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = input?.accessToken ?? session?.access_token;
      if (!token) {
        if (isAuthBypassed()) {
          return { pulled: 0, pushed: 0, errors: [] as string[], skipped: true as const };
        }
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Sign in required to sync.",
        });
      }

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anonKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Supabase is not configured.",
        });
      }

      const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
      const remote = createSupabaseClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      const result = await runSync({
        db: db as unknown as import("@kash/db-local").SqliteDb,
        supabase: remote,
        userId: ctx.userId,
      });

      return { ...result, skipped: false as const };
    }),
});
