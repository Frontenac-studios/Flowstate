import { and, asc, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { clients, projectMilestones, projects, tasks } from "@/db/tables";
import {
  addDays,
  endOfIsoWeekSunday,
  parseISODateString,
  toISODateString,
} from "@/lib/dates/local-day";
import { bucketComingUp, type ComingUpItem } from "@/lib/week/bucket-coming-up";

import { createTRPCRouter, protectedProcedure } from "../init";

/**
 * W14 — the Week steering deck. Assembling reads that surface existing data on the
 * deck (they do not duplicate the heavy views on Projects/Money). Owner-scoped by
 * `ctx.userId`; no new tables.
 */
export const steeringRouter = createTRPCRouter({
  /**
   * "Coming up": dated deliverables across every client for the next fortnight —
   * scheduled tasks and project milestones — bucketed this-week / next-week, overdue
   * excluded (that lives on Today).
   */
  comingUp: protectedProcedure
    .input(z.object({ localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const ref = parseISODateString(input.localDate);
      const thisWeekEndIso = toISODateString(endOfIsoWeekSunday(ref));
      const horizonEndIso = toISODateString(addDays(endOfIsoWeekSunday(ref), 7));

      const [taskRows, milestoneRows] = await Promise.all([
        db
          .select({
            id: tasks.id,
            title: tasks.title,
            date: tasks.scheduledDate,
            category: projects.category,
            projectName: projects.name,
            clientName: clients.name,
          })
          .from(tasks)
          .innerJoin(projects, eq(tasks.projectId, projects.id))
          .leftJoin(clients, eq(projects.clientId, clients.id))
          .where(
            and(
              eq(tasks.userId, ctx.userId),
              isNull(tasks.completedAt),
              isNotNull(tasks.scheduledDate),
              gte(tasks.scheduledDate, input.localDate),
              lte(tasks.scheduledDate, horizonEndIso)
            )
          ),
        db
          .select({
            id: projectMilestones.id,
            title: projectMilestones.title,
            date: projectMilestones.targetDate,
            category: projects.category,
            projectName: projects.name,
            clientName: clients.name,
          })
          .from(projectMilestones)
          .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
          .leftJoin(clients, eq(projects.clientId, clients.id))
          .where(
            and(
              eq(projectMilestones.userId, ctx.userId),
              isNull(projectMilestones.completedAt),
              isNotNull(projectMilestones.targetDate),
              gte(projectMilestones.targetDate, input.localDate),
              lte(projectMilestones.targetDate, horizonEndIso)
            )
          ),
      ]);

      const items: ComingUpItem[] = [
        ...taskRows.map((r) => ({
          id: r.id,
          title: r.title,
          date: r.date ?? input.localDate,
          kind: "task" as const,
          category: r.category,
          clientName: r.clientName,
          projectName: r.projectName,
        })),
        ...milestoneRows.map((r) => ({
          id: r.id,
          title: r.title,
          date: r.date ?? input.localDate,
          kind: "milestone" as const,
          category: r.category,
          clientName: r.clientName,
          projectName: r.projectName,
        })),
      ];

      return bucketComingUp({
        items,
        todayIso: input.localDate,
        thisWeekEndIso,
        horizonEndIso,
      });
    }),

  /**
   * "Waiting on you" (v1): live deals in flight = prospect-state projects, by client.
   * The sourced-batch and follow-up rows light up with W10 (the sourcing agent); this
   * is the one row-type that has data today — no leads schema invented here.
   */
  waitingOnYou: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        id: projects.id,
        name: projects.name,
        category: projects.category,
        clientName: clients.name,
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(
        and(
          eq(projects.userId, ctx.userId),
          eq(projects.state, "prospect"),
          isNull(projects.archivedAt)
        )
      )
      .orderBy(asc(projects.createdAt));
  }),
});
