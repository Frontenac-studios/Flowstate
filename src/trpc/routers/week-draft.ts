import { z } from "zod";

import { generateWeekDraft } from "@/server/claude/generate-week-draft";
import { fetchWeekDraftContext } from "@/server/claude/fetch-week-draft-context";

import { createTRPCRouter, protectedProcedure } from "../init";

export const weekDraftRouter = createTRPCRouter({
  generate: protectedProcedure
    .input(
      z
        .object({
          weekStartIso: z.string().optional(),
          tzOffsetMinutes: z.number().int().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      void input?.tzOffsetMinutes;
      const context = await fetchWeekDraftContext(ctx.userId, input?.weekStartIso);
      return generateWeekDraft(context);
    }),
});
