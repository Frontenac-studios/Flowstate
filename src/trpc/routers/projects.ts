import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { projects } from "@/db/schema/projects";
import { slugifyProjectName } from "@/lib/projects/slugify";

import { createTRPCRouter, protectedProcedure } from "../init";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

export const projectsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
      })
      .from(projects)
      .where(eq(projects.userId, ctx.userId))
      .orderBy(projects.name);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        slug: z.string().min(1).max(64).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = (input.slug ?? slugifyProjectName(input.name)).toLowerCase();

      const [existing] = await db
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
        })
        .from(projects)
        .where(and(eq(projects.userId, ctx.userId), eq(projects.slug, slug)))
        .limit(1);

      if (existing) return existing;

      let row: { id: string; name: string; slug: string } | undefined;
      try {
        [row] = await db
          .insert(projects)
          .values({
            userId: ctx.userId,
            name: input.name.trim(),
            slug,
          })
          .returning({
            id: projects.id,
            name: projects.name,
            slug: projects.slug,
          });
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

      return row;
    }),
});
