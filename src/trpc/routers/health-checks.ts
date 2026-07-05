import { desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { healthChecks } from "@/db/schema/health-checks";

import { createTRPCRouter, protectedProcedure } from "../init";

const listInput = z.object({
  limit: z.number().int().min(1).max(100).optional(),
});

export const healthChecksRouter = createTRPCRouter({
  list: protectedProcedure.input(listInput).query(async ({ input }) => {
    const limit = input.limit ?? 50;

    return db.select().from(healthChecks).orderBy(desc(healthChecks.checkedAt)).limit(limit);
  }),

  getLatest: protectedProcedure.input(z.object({})).query(async () => {
    const [row] = await db
      .select()
      .from(healthChecks)
      .orderBy(desc(healthChecks.checkedAt))
      .limit(1);

    return row ?? null;
  }),
});
