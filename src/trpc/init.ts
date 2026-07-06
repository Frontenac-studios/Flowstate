import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";

import { resolveAuthContext } from "@/lib/auth/auth-bypass";
import { createClient } from "@/lib/supabase/server";

export const createTRPCContext = async ({ headers }: { headers: Headers }) => {
  void headers;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = resolveAuthContext(user);

  return {
    userId: auth?.userId ?? null,
    email: auth?.email ?? null,
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
  return next({
    ctx: {
      userId: ctx.userId,
      email: ctx.email,
    },
  });
});
