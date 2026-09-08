import { and, asc, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { clients, leadOutreach, leads, projectMilestones, projects, tasks } from "@/db/tables";
import {
  addDays,
  endOfIsoWeekSunday,
  parseISODateString,
  toISODateString,
} from "@/lib/dates/local-day";
import { bucketComingUp, type ComingUpItem } from "@/lib/week/bucket-coming-up";
import { buildWaitingOnYou } from "@/lib/week/waiting-on-you";

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
   * "Waiting on you": one urgency-sorted queue folding the pipeline and the outreach
   * (v1-scope §W14) — the sourced batch to triage, follow-ups the aging clock says
   * you owe, and live deals needing a move. Three row types, no funnel stage counts:
   * those live on the Projects board, and Week asks "what needs me".
   *
   * The rows are assembled by the pure `buildWaitingOnYou`; this does the reads.
   * Prospect projects with no lead behind them (added by hand, before the sourcing
   * agent existed) are carried through so nothing that used to show up vanishes.
   */
  waitingOnYou: protectedProcedure.query(async ({ ctx }) => {
    const [leadRows, sentRows, prospectRows] = await Promise.all([
      db
        .select({
          id: leads.id,
          companyName: leads.companyName,
          state: leads.state,
          projectId: leads.projectId,
        })
        .from(leads)
        .where(
          and(
            eq(leads.userId, ctx.userId),
            inArray(leads.state, ["new", "contacted", "engaged", "proposal"])
          )
        ),
      // The aging clock reads what you actually SENT, not what was drafted — a draft
      // sitting unsent is not contact, and the follow-up is owed all the same.
      db
        .select({ leadId: leadOutreach.leadId, sentAt: leadOutreach.sentAt })
        .from(leadOutreach)
        .where(and(eq(leadOutreach.userId, ctx.userId), isNotNull(leadOutreach.sentAt))),
      db
        .select({
          id: projects.id,
          name: projects.name,
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
        .orderBy(asc(projects.createdAt)),
    ]);

    const lastSentByLead = new Map<string, Date>();
    for (const row of sentRows) {
      if (!row.sentAt) continue;
      const current = lastSentByLead.get(row.leadId);
      if (!current || row.sentAt.getTime() > current.getTime()) {
        lastSentByLead.set(row.leadId, row.sentAt);
      }
    }

    // A prospect project that a lead already speaks for would otherwise appear twice.
    const claimedProjectIds = new Set(
      leadRows.map((l) => l.projectId).filter((id): id is string => id !== null)
    );

    return buildWaitingOnYou({
      leads: leadRows.map((l) => ({
        id: l.id,
        companyName: l.companyName,
        state: l.state,
        projectId: l.projectId,
        lastSentAt: lastSentByLead.get(l.id) ?? null,
      })),
      orphanProjects: prospectRows.filter((p) => !claimedProjectIds.has(p.id)),
      now: new Date(),
    });
  }),
});
