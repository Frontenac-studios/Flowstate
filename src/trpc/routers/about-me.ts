import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncAboutMeRow } from "@/db/record-sync-mutation";
import { aboutMeSections, userValues } from "@/db/tables";
import {
  type AboutMeSection,
  aboutMeSectionSchema,
  proseBodySchema,
  valueSourceSchema,
  VALUES_MAX,
} from "@/lib/about-me/constants";
import { canAddValue, isDuplicateValue, valueLabelSchema } from "@/lib/about-me/values";

import { createTRPCRouter, protectedProcedure } from "../init";

/** Sections whose content is free prose the user edits directly. */
const proseSectionSchema = aboutMeSectionSchema.extract(["work", "life"]);

const valuesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(userValues)
      .where(eq(userValues.userId, ctx.userId))
      .orderBy(asc(userValues.sortOrder), asc(userValues.createdAt));
  }),

  add: protectedProcedure
    .input(z.object({ label: valueLabelSchema, source: valueSourceSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select()
        .from(userValues)
        .where(eq(userValues.userId, ctx.userId))
        .orderBy(asc(userValues.sortOrder));

      if (!canAddValue(existing.length)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You can have up to ${VALUES_MAX} core values.`,
        });
      }

      if (
        isDuplicateValue(
          input.label,
          existing.map((v) => v.label)
        )
      ) {
        throw new TRPCError({ code: "CONFLICT", message: "That value is already in your set." });
      }

      const nextSortOrder = existing.reduce((max, v) => Math.max(max, v.sortOrder + 1), 0);

      const [row] = await db
        .insert(userValues)
        .values({
          userId: ctx.userId,
          label: input.label,
          source: input.source,
          sortOrder: nextSortOrder,
        })
        .returning();

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add value." });
      }

      await syncAboutMeRow("user_values", row.id, "insert", row);
      return row;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(userValues)
        .where(and(eq(userValues.id, input.id), eq(userValues.userId, ctx.userId)))
        .returning({ id: userValues.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Value not found." });
      }

      await syncAboutMeRow("user_values", row.id, "delete", { id: row.id });
      return row;
    }),
});

const sectionsRouter = createTRPCRouter({
  // All prose bodies as a record keyed by section, defaulting to "" for unset sections.
  get: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(aboutMeSections)
      .where(eq(aboutMeSections.userId, ctx.userId));

    const bodies: Record<AboutMeSection, string> = {
      values: "",
      work: "",
      life: "",
      constraints: "",
    };
    for (const row of rows) {
      bodies[row.section] = row.body;
    }
    return bodies;
  }),

  // Upsert one section's prose. Future-only by contract (§13 V2-3): this just stores the
  // current body; it never recomputes past or active plans.
  updateBody: protectedProcedure
    .input(z.object({ section: proseSectionSchema, body: proseBodySchema }))
    .mutation(async ({ ctx, input }) => {
      await db
        .insert(aboutMeSections)
        .values({ userId: ctx.userId, section: input.section, body: input.body })
        .onConflictDoUpdate({
          target: [aboutMeSections.userId, aboutMeSections.section],
          set: { body: input.body, updatedAt: new Date() },
        });

      return { section: input.section, body: input.body };
    }),
});

export const aboutMeRouter = createTRPCRouter({
  values: valuesRouter,
  sections: sectionsRouter,
});
