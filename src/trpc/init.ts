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
export const baseProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
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
