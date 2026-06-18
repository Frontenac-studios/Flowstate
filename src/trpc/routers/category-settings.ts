import { eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { categorySettings } from "@/db/tables";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import {
  type CategorySettingView,
  defaultCategorySortOrder,
  effectiveCategoryLabel,
  MAX_CATEGORY_LABEL_LENGTH,
} from "@/lib/projects/category-settings";

import { createTRPCRouter, protectedProcedure } from "../init";

const categorySchema = z.enum(PROJECT_CATEGORIES);

// Phase 1 (1E / Q3): labels + sort order only. Colors stay with Design Tokens and
// weekly targets are schema-only until Week/review, so neither is writable here.
export const categorySettingsRouter = createTRPCRouter({
  // Returns all five categories, merging any stored overrides over the seed defaults,
  // ordered by effective sort order. Rows are created lazily on first edit (1B seeding
  // is separate) — until then everything falls back to PROJECT_CATEGORY_META.
  get: protectedProcedure.query(async ({ ctx }): Promise<CategorySettingView[]> => {
    const rows = await db
      .select({
        category: categorySettings.category,
        label: categorySettings.label,
        sortOrder: categorySettings.sortOrder,
      })
      .from(categorySettings)
      .where(eq(categorySettings.userId, ctx.userId));

    const byCategory = new Map(rows.map((r) => [r.category, r]));

    return PROJECT_CATEGORIES.map((category) => {
      const row = byCategory.get(category);
      const labelOverride = row?.label ?? null;
      return {
        category,
        label: effectiveCategoryLabel(category, labelOverride),
        labelOverride,
        sortOrder: row?.sortOrder ?? defaultCategorySortOrder(category),
      };
    }).sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        defaultCategorySortOrder(a.category) - defaultCategorySortOrder(b.category)
    );
  }),

  // Upsert a single category's label override. An empty/whitespace label resets to the
  // seed default (stored as null) rather than persisting a blank name.
  update: protectedProcedure
    .input(
      z.object({
        category: categorySchema,
        label: z.string().max(MAX_CATEGORY_LABEL_LENGTH),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const trimmed = input.label.trim();
      const label = trimmed.length > 0 ? trimmed : null;

      await db
        .insert(categorySettings)
        .values({
          userId: ctx.userId,
          category: input.category,
          label,
          sortOrder: defaultCategorySortOrder(input.category),
        })
        .onConflictDoUpdate({
          target: [categorySettings.userId, categorySettings.category],
          set: { label, updatedAt: new Date() },
        });

      return { category: input.category, label };
    }),

  // Persist a full reordering: assigns sort_order = position for every category, so the
  // stored order always matches what the user sees. Requires the complete set exactly once.
  reorder: protectedProcedure
    .input(z.object({ order: z.array(categorySchema) }))
    .mutation(async ({ ctx, input }) => {
      const unique = new Set(input.order);
      if (input.order.length !== PROJECT_CATEGORIES.length || unique.size !== input.order.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Reorder must list each category exactly once.",
        });
      }

      await db.transaction(async (tx) => {
        for (let i = 0; i < input.order.length; i += 1) {
          const category = input.order[i];
          await tx
            .insert(categorySettings)
            .values({ userId: ctx.userId, category, sortOrder: i })
            .onConflictDoUpdate({
              target: [categorySettings.userId, categorySettings.category],
              set: { sortOrder: i, updatedAt: new Date() },
            });
        }
      });

      return { order: input.order };
    }),
});
