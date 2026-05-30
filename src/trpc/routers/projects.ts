import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { syncProjectRow } from "@/db/record-sync-mutation";
import { projects } from "@/db/tables";
import { PROJECT_CATEGORIES } from "@/lib/projects/categories";
import { slugifyProjectName } from "@/lib/projects/slugify";

import { createTRPCRouter, protectedProcedure } from "../init";

const categorySchema = z.enum(PROJECT_CATEGORIES);

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

async function getOwnedProject(userId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }

  return row;
}

export const projectsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        category: projects.category,
        description: projects.description,
      })
      .from(projects)
      .where(eq(projects.userId, ctx.userId))
      .orderBy(projects.name);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getOwnedProject(ctx.userId, input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        slug: z.string().min(1).max(64).optional(),
        category: categorySchema,
        description: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = (input.slug ?? slugifyProjectName(input.name)).toLowerCase();

      const [existing] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.userId, ctx.userId), eq(projects.slug, slug)))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A project with this slug already exists.",
        });
      }

      let row: typeof projects.$inferSelect | undefined;
      try {
        [row] = await db
          .insert(projects)
          .values({
            userId: ctx.userId,
            name: input.name.trim(),
            slug,
            category: input.category,
            description: input.description ?? null,
          })
          .returning();
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A project with this slug already exists.",
          });
        }
        throw error;
      }

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project.",
        });
      }

      await syncProjectRow(row.id, "insert", row);
      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        category: categorySchema.optional(),
        description: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedProject(ctx.userId, input.id);

      const patch: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.category !== undefined) patch.category = input.category;
      if (input.description !== undefined) patch.description = input.description;

      const [row] = await db
        .update(projects)
        .set(patch)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.userId)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update project.",
        });
      }

      await syncProjectRow(row.id, "update", row);
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedProject(ctx.userId, input.id);

      await db
        .delete(projects)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.userId)));

      await syncProjectRow(input.id, "delete", { id: input.id, userId: ctx.userId });
      return { id: input.id };
    }),
});
