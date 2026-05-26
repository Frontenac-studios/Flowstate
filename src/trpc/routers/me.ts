import { createTRPCRouter, protectedProcedure } from "../init";

export const meRouter = createTRPCRouter({
  profile: protectedProcedure.query(({ ctx }) => ({
    userId: ctx.userId,
    email: ctx.email,
  })),
});
