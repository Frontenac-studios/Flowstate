import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncAboutMeRow } from "@/db/record-sync-mutation";
import { aboutMeSections, aboutMeSuggestions, userConstraints, userValues } from "@/db/tables";
import {
  type AboutMeSection,
  aboutMeSectionSchema,
  constraintSeveritySchema,
  constraintTypeSchema,
  proseBodySchema,
  valueSourceSchema,
  VALUES_MAX,
} from "@/lib/about-me/constants";
import { constraintScheduleSchema } from "@/lib/about-me/constraints";
import {
  type ConstraintSuggestionPayload,
  parseSuggestionPayload,
  type ProseSuggestionPayload,
  type ValueSuggestionPayload,
} from "@/lib/about-me/suggestions";
import { canAddValue, isDuplicateValue, valueLabelSchema } from "@/lib/about-me/values";

import { createTRPCRouter, protectedProcedure } from "../init";

/** Sections whose content is free prose the user edits directly. */
const proseSectionSchema = aboutMeSectionSchema.extract(["work", "life"]);

const constraintLabelSchema = z.string().trim().min(1, "Add a short label.").max(200);

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

const constraintsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(userConstraints)
      .where(eq(userConstraints.userId, ctx.userId))
      .orderBy(asc(userConstraints.sortOrder), asc(userConstraints.createdAt));
  }),

  add: protectedProcedure
    .input(
      z.object({
        type: constraintTypeSchema,
        label: constraintLabelSchema,
        schedule: constraintScheduleSchema.nullish(),
        severity: constraintSeveritySchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select({ sortOrder: userConstraints.sortOrder })
        .from(userConstraints)
        .where(eq(userConstraints.userId, ctx.userId));
      const nextSortOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder + 1), 0);

      const [row] = await db
        .insert(userConstraints)
        .values({
          userId: ctx.userId,
          type: input.type,
          label: input.label,
          schedule: input.schedule ?? null,
          severity: input.severity,
          author: "user",
          sortOrder: nextSortOrder,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add constraint.",
        });
      }

      await syncAboutMeRow("user_constraints", row.id, "insert", row);
      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        type: constraintTypeSchema.optional(),
        label: constraintLabelSchema.optional(),
        schedule: constraintScheduleSchema.nullish(),
        severity: constraintSeveritySchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (rest.type !== undefined) patch.type = rest.type;
      if (rest.label !== undefined) patch.label = rest.label;
      if (rest.schedule !== undefined) patch.schedule = rest.schedule;
      if (rest.severity !== undefined) patch.severity = rest.severity;

      const [row] = await db
        .update(userConstraints)
        .set(patch)
        .where(and(eq(userConstraints.id, id), eq(userConstraints.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Constraint not found." });
      }

      await syncAboutMeRow("user_constraints", row.id, "update", row);
      return row;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(userConstraints)
        .where(and(eq(userConstraints.id, input.id), eq(userConstraints.userId, ctx.userId)))
        .returning({ id: userConstraints.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Constraint not found." });
      }

      await syncAboutMeRow("user_constraints", row.id, "delete", { id: row.id });
      return row;
    }),
});

const suggestionsRouter = createTRPCRouter({
  // Pending AI proposals only — the ghosts the user can accept or dismiss.
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(aboutMeSuggestions)
      .where(
        and(eq(aboutMeSuggestions.userId, ctx.userId), eq(aboutMeSuggestions.status, "pending"))
      )
      .orderBy(asc(aboutMeSuggestions.createdAt));
  }),

  accept: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [suggestion] = await db
        .select()
        .from(aboutMeSuggestions)
        .where(and(eq(aboutMeSuggestions.id, input.id), eq(aboutMeSuggestions.userId, ctx.userId)))
        .limit(1);

      if (!suggestion || suggestion.status !== "pending") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Suggestion not available." });
      }

      const section = suggestion.targetSection;
      const payload = parseSuggestionPayload(section, suggestion.payload);

      // Apply the proposal to its target, future-only (V2-3). AI-authored rows keep the
      // suggestion's provenance (V2-4).
      if (section === "values") {
        const { label } = payload as ValueSuggestionPayload;
        const existing = await db
          .select({ label: userValues.label, sortOrder: userValues.sortOrder })
          .from(userValues)
          .where(eq(userValues.userId, ctx.userId));

        if (!canAddValue(existing.length)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `You can have up to ${VALUES_MAX} core values. Remove one first.`,
          });
        }
        if (
          !isDuplicateValue(
            label,
            existing.map((v) => v.label)
          )
        ) {
          const nextSortOrder = existing.reduce((max, v) => Math.max(max, v.sortOrder + 1), 0);
          const [row] = await db
            .insert(userValues)
            .values({ userId: ctx.userId, label, source: "custom", sortOrder: nextSortOrder })
            .returning();
          if (row) await syncAboutMeRow("user_values", row.id, "insert", row);
        }
      } else if (section === "constraints") {
        const c = payload as ConstraintSuggestionPayload;
        const existing = await db
          .select({ sortOrder: userConstraints.sortOrder })
          .from(userConstraints)
          .where(eq(userConstraints.userId, ctx.userId));
        const nextSortOrder = existing.reduce((max, r) => Math.max(max, r.sortOrder + 1), 0);
        const [row] = await db
          .insert(userConstraints)
          .values({
            userId: ctx.userId,
            type: c.type,
            label: c.label,
            schedule: c.schedule ?? null,
            severity: c.severity,
            author: "ai",
            sourceText: suggestion.sourceText,
            learnedAt: suggestion.learnedAt,
            sortOrder: nextSortOrder,
          })
          .returning();
        if (row) await syncAboutMeRow("user_constraints", row.id, "insert", row);
      } else {
        // work | life — append the proposed prose to the existing body.
        const { text } = payload as ProseSuggestionPayload;
        const [existing] = await db
          .select({ body: aboutMeSections.body })
          .from(aboutMeSections)
          .where(and(eq(aboutMeSections.userId, ctx.userId), eq(aboutMeSections.section, section)))
          .limit(1);
        const body = existing?.body ? `${existing.body}\n\n${text}` : text;
        await db
          .insert(aboutMeSections)
          .values({ userId: ctx.userId, section, body })
          .onConflictDoUpdate({
            target: [aboutMeSections.userId, aboutMeSections.section],
            set: { body, updatedAt: new Date() },
          });
      }

      const [updated] = await db
        .update(aboutMeSuggestions)
        .set({ status: "applied", updatedAt: new Date() })
        .where(eq(aboutMeSuggestions.id, suggestion.id))
        .returning();
      if (updated) await syncAboutMeRow("about_me_suggestions", updated.id, "update", updated);

      return { id: suggestion.id, section };
    }),

  dismiss: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(aboutMeSuggestions)
        .set({ status: "dismissed", updatedAt: new Date() })
        .where(
          and(
            eq(aboutMeSuggestions.id, input.id),
            eq(aboutMeSuggestions.userId, ctx.userId),
            eq(aboutMeSuggestions.status, "pending")
          )
        )
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Suggestion not available." });
      }

      await syncAboutMeRow("about_me_suggestions", row.id, "update", row);
      return { id: row.id };
    }),
});

export const aboutMeRouter = createTRPCRouter({
  values: valuesRouter,
  sections: sectionsRouter,
  constraints: constraintsRouter,
  suggestions: suggestionsRouter,
});
