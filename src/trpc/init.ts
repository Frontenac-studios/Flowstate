import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export const createTRPCContext = async ({ headers }: { headers: Headers }) => {
  void headers; // session lookup will use headers in a later phase
  return { userId: null as string | null };
};

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
