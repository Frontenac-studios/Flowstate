import { and, desc, eq, gte, isNotNull, isNull, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@/db";
import { appSettings, clients, projects, rates, timeEntries, timeTags, tasks } from "@/db/tables";
import type { CandidateRate } from "@/lib/rates/resolve-rate";
import { aggregateTimeReport } from "@/lib/time/aggregate-time-report";
import { aggregateWeek } from "@/lib/time/aggregate-week";
import { computeUntrackedGaps } from "@/lib/time/compute-untracked-gaps";
import { computeIdleTrim } from "@/lib/time/idle-trim";
import { localDayUtcBounds } from "@/lib/eod/local-day-bounds";
import { localWeekUtcBounds } from "@/lib/time/local-week-bounds";
import { startedOnLocalDay } from "@/lib/dates/local-time";
import { DEFAULT_DAY_END_HOUR, DEFAULT_DAY_START_HOUR } from "@/lib/settings/constants";

import { createTRPCRouter, protectedProcedure } from "../init";

/** Manual entries can't exceed a day — guards against fat-fingered windows. */
const MAX_ENTRY_SECONDS = 24 * 60 * 60;

/** A day-close gap must be at least this long to be worth reconciling. */
const MIN_GAP_SECONDS = 15 * 60;

/** Whole seconds between two instants, floored at zero. Elapsed is always derived. */
function elapsedSecondsSince(startedAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
}

const manualWindow = z
  .object({ startedAt: z.coerce.date(), endedAt: z.coerce.date() })
  .refine((w) => w.endedAt.getTime() > w.startedAt.getTime(), {
    message: "End must be after start.",
  })
  .refine((w) => w.endedAt.getTime() - w.startedAt.getTime() <= MAX_ENTRY_SECONDS * 1000, {
    message: "Entry can't be longer than 24 hours.",
  });

/**
 * Resolve the project a task belongs to (required — an entry is project-scoped as
 * of W2) and whether its time is billable by default (the project has a client).
 * Until the project-first timer lands (W2b), a timer is still started from a task,
 * so a task with no project is a clear error rather than a silent null.
 */
async function resolveEntryProject(taskId: string, userId: string) {
  const [row] = await db
    .select({ projectId: tasks.projectId, clientId: projects.clientId })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
  }
  if (!row.projectId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Start a timer from a task that belongs to a project.",
    });
  }
  return { projectId: row.projectId, billable: row.clientId != null };
}

export const timeEntriesRouter = createTRPCRouter({
  /**
   * Start a timer. Project-first: a project is enough (a client call is not a task);
   * a task is optional and, when given, resolves the project. Enforces the
   * single-timer invariant — any already-running entry is stopped first and named
   * in the response, so the UI can say what it interrupted.
   */
  start: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().uuid().optional(),
          taskId: z.string().uuid().optional(),
          description: z.string().trim().max(500).optional(),
        })
        .refine((v) => v.projectId != null || v.taskId != null, {
          message: "A project or a task is required to start a timer.",
        })
    )
    .mutation(async ({ ctx, input }) => {
      // Resolve the project (required) and the billable default, either directly
      // from projectId or through the task.
      let projectId: string;
      let billable: boolean;
      if (input.projectId != null) {
        const [project] = await db
          .select({ id: projects.id, clientId: projects.clientId })
          .from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)))
          .limit(1);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
        }
        projectId = project.id;
        billable = project.clientId != null;
      } else {
        ({ projectId, billable } = await resolveEntryProject(input.taskId!, ctx.userId));
      }

      const now = new Date();

      // Single-timer invariant: stop whatever is running before starting the next.
      const [stopped] = await db
        .update(timeEntries)
        .set({ endedAt: now, updatedAt: now })
        .where(and(eq(timeEntries.userId, ctx.userId), isNull(timeEntries.endedAt)))
        .returning({
          id: timeEntries.id,
          projectId: timeEntries.projectId,
          startedAt: timeEntries.startedAt,
        });

      const [row] = await db
        .insert(timeEntries)
        .values({
          userId: ctx.userId,
          projectId,
          taskId: input.taskId ?? null,
          description: input.description ?? null,
          startedAt: now,
          endedAt: null,
          reason: null,
          source: "timer",
          billable,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start time entry.",
        });
      }

      return {
        entryId: row.id,
        stopped: stopped
          ? {
              entryId: stopped.id,
              projectId: stopped.projectId,
              elapsedSeconds: elapsedSecondsSince(stopped.startedAt, now),
            }
          : null,
      };
    }),

  /** The currently-running timer (endedAt null), with its project — or null. */
  getRunning: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select({
        entryId: timeEntries.id,
        projectId: timeEntries.projectId,
        projectName: projects.name,
        taskId: timeEntries.taskId,
        description: timeEntries.description,
        startedAt: timeEntries.startedAt,
        billable: timeEntries.billable,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(eq(timeEntries.userId, ctx.userId), isNull(timeEntries.endedAt)))
      .orderBy(desc(timeEntries.startedAt))
      .limit(1);

    return row ?? null;
  }),

  /** Stop the running timer (a specific entry, or whatever is running). */
  stop: protectedProcedure
    .input(z.object({ entryId: z.string().uuid().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const running = isNull(timeEntries.endedAt);
      const where = input?.entryId
        ? and(eq(timeEntries.id, input.entryId), eq(timeEntries.userId, ctx.userId), running)
        : and(eq(timeEntries.userId, ctx.userId), running);

      const [row] = await db
        .update(timeEntries)
        .set({ endedAt: now, updatedAt: now })
        .where(where)
        .returning({ id: timeEntries.id, startedAt: timeEntries.startedAt });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No running timer to stop." });
      }

      return { entryId: row.id, elapsedSeconds: elapsedSecondsSince(row.startedAt, now) };
    }),

  /**
   * Resolve an idle window on the running timer (W2f). The desktop shell detects
   * the machine sat idle past the threshold and, on return, asks "keep or trim?".
   * `keep` counts the away time as worked (no-op). `trim` ends the running segment
   * where idleness began and opens a fresh segment now, so the away minutes fall
   * into the gap between two real entries — never silently subtracted. No running
   * timer is a benign no-op (the user may have stopped it while away).
   */
  resolveIdle: protectedProcedure
    .input(
      z.object({
        awaySeconds: z.number().int().nonnegative(),
        action: z.enum(["keep", "trim"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      const [running] = await db
        .select({
          id: timeEntries.id,
          projectId: timeEntries.projectId,
          taskId: timeEntries.taskId,
          description: timeEntries.description,
          billable: timeEntries.billable,
          startedAt: timeEntries.startedAt,
        })
        .from(timeEntries)
        .where(and(eq(timeEntries.userId, ctx.userId), isNull(timeEntries.endedAt)))
        .orderBy(desc(timeEntries.startedAt))
        .limit(1);

      if (!running) return { resolved: false as const };
      if (input.action === "keep") return { resolved: true as const, trimmed: false as const };

      const trim = computeIdleTrim(running.startedAt, now, input.awaySeconds);

      // Close (or drop) the segment that ran up to the idle, then resume timing.
      if (trim.dropOriginal) {
        await db
          .delete(timeEntries)
          .where(and(eq(timeEntries.id, running.id), eq(timeEntries.userId, ctx.userId)));
      } else {
        await db
          .update(timeEntries)
          .set({ endedAt: trim.closeAt, updatedAt: now })
          .where(
            and(
              eq(timeEntries.id, running.id),
              eq(timeEntries.userId, ctx.userId),
              isNull(timeEntries.endedAt)
            )
          );
      }

      const [fresh] = await db
        .insert(timeEntries)
        .values({
          userId: ctx.userId,
          projectId: running.projectId,
          taskId: running.taskId,
          description: running.description,
          startedAt: now,
          endedAt: null,
          reason: null,
          source: "timer",
          billable: running.billable,
        })
        .returning({ id: timeEntries.id });

      return {
        resolved: true as const,
        trimmed: true as const,
        keptSeconds: trim.keptSeconds,
        newEntryId: fresh?.id ?? null,
      };
    }),

  end: protectedProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        // "pause" ends the running segment without ending the focus session —
        // resuming starts a fresh entry, so active time is the sum of segments
        // and the paused gap is simply never recorded.
        reason: z.enum(["done", "park", "esc", "pause"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const endedAt = new Date();

      const [row] = await db
        .update(timeEntries)
        .set({ endedAt, reason: input.reason })
        .where(
          and(
            eq(timeEntries.id, input.entryId),
            eq(timeEntries.userId, ctx.userId),
            isNull(timeEntries.endedAt)
          )
        )
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time entry not found or already ended.",
        });
      }

      return { entryId: row.id };
    }),

  /** Completed entries for a task, newest first — powers the manual-entry list. */
  listForTask: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({
          id: timeEntries.id,
          startedAt: timeEntries.startedAt,
          endedAt: timeEntries.endedAt,
          reason: timeEntries.reason,
        })
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.userId, ctx.userId),
            eq(timeEntries.taskId, input.taskId),
            isNotNull(timeEntries.endedAt)
          )
        )
        .orderBy(desc(timeEntries.startedAt))
        .limit(50);

      return rows;
    }),

  listStartedForLocalDate: protectedProcedure
    .input(
      z.object({
        localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        tzOffsetMinutes: z.number().int().min(-840).max(840),
      })
    )
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({
          taskId: timeEntries.taskId,
          startedAt: timeEntries.startedAt,
        })
        .from(timeEntries)
        .where(eq(timeEntries.userId, ctx.userId));

      return rows
        .filter((row) => startedOnLocalDay(row.startedAt, input.localDate, input.tzOffsetMinutes))
        .map((row) => ({ taskId: row.taskId, startedAt: row.startedAt }));
    }),

  listAllStarted: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        taskId: timeEntries.taskId,
        startedAt: timeEntries.startedAt,
      })
      .from(timeEntries)
      .where(eq(timeEntries.userId, ctx.userId));

    return rows;
  }),

  /** Add a time block by hand (reason "manual"); works on any task. */
  create: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }).and(manualWindow))
    .mutation(async ({ ctx, input }) => {
      const { projectId, billable } = await resolveEntryProject(input.taskId, ctx.userId);

      const [row] = await db
        .insert(timeEntries)
        .values({
          userId: ctx.userId,
          projectId,
          taskId: input.taskId,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          reason: "manual",
          source: "manual",
          billable,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create time entry.",
        });
      }

      return { entryId: row.id };
    }),

  /** Edit an existing entry's window. Touches updatedAt so sync resolves it. */
  update: protectedProcedure
    .input(z.object({ entryId: z.string().uuid() }).and(manualWindow))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(timeEntries)
        .set({ startedAt: input.startedAt, endedAt: input.endedAt, updatedAt: new Date() })
        .where(
          and(
            eq(timeEntries.id, input.entryId),
            eq(timeEntries.userId, ctx.userId),
            isNotNull(timeEntries.endedAt)
          )
        )
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time entry not found or still running.",
        });
      }

      return { entryId: row.id };
    }),

  /**
   * End-of-week roll-up (Phase 2.5): focus seconds for the current browser-local
   * week, grouped by derived category and by project. Read-only; category comes
   * from the joined task (decision 2.1 — never snapshotted).
   */
  weeklyRollup: protectedProcedure
    .input(z.object({ tzOffsetMinutes: z.number().int().min(-720).max(840) }))
    .query(async ({ ctx, input }) => {
      const { start, end } = localWeekUtcBounds(new Date(), input.tzOffsetMinutes);

      const rows = await db
        .select({
          startedAt: timeEntries.startedAt,
          endedAt: timeEntries.endedAt,
          category: tasks.category,
          projectId: tasks.projectId,
          projectName: projects.name,
        })
        .from(timeEntries)
        .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(
          and(
            eq(timeEntries.userId, ctx.userId),
            gte(timeEntries.startedAt, start),
            lt(timeEntries.startedAt, end)
          )
        );

      const rollup = aggregateWeek({ entries: rows });

      return {
        weekStart: start,
        weekEnd: end,
        ...rollup,
      };
    }),

  /**
   * Untracked spans over 15 minutes in the working day (W2c gap fill). Powers the
   * close's "2:10–4:00 is untracked — what was that?". Computed within the user's
   * day-start/day-end hours; a running timer counts as covered up to now, and the
   * window never runs past now, so a day in progress proposes no future gaps.
   */
  listDayGaps: protectedProcedure
    .input(
      z.object({
        localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        tzOffsetMinutes: z.number().int().min(-840).max(840),
      })
    )
    .query(async ({ ctx, input }) => {
      const { start, end } = localDayUtcBounds(input.localDate, input.tzOffsetMinutes);

      const [settings] = await db
        .select({ dayStartHour: appSettings.dayStartHour, dayEndHour: appSettings.dayEndHour })
        .from(appSettings)
        .where(eq(appSettings.userId, ctx.userId))
        .limit(1);

      const dayStartHour = settings?.dayStartHour ?? DEFAULT_DAY_START_HOUR;
      const dayEndHour = settings?.dayEndHour ?? DEFAULT_DAY_END_HOUR;

      const entries = await db
        .select({ startedAt: timeEntries.startedAt, endedAt: timeEntries.endedAt })
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.userId, ctx.userId),
            gte(timeEntries.startedAt, start),
            lt(timeEntries.startedAt, end)
          )
        );

      const gaps = computeUntrackedGaps({
        entries,
        dayStartMs: start.getTime() + dayStartHour * 60 * 60 * 1000,
        dayEndMs: start.getTime() + dayEndHour * 60 * 60 * 1000,
        nowMs: Date.now(),
        minGapSeconds: MIN_GAP_SECONDS,
      });

      return gaps.map((g) => ({
        startedAt: g.startedAt,
        endedAt: g.endedAt,
        durationSeconds: Math.floor((g.endedAt.getTime() - g.startedAt.getTime()) / 1000),
      }));
    }),

  /**
   * Assign an untracked span to a project (gap fill) — a project-first manual
   * entry with no task. Source defaults to `manual`; the day-close passes
   * `gap_fill` so reconciled time is distinguishable from hand-typed entries.
   */
  createForProject: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().uuid(),
          description: z.string().trim().max(500).optional(),
          source: z.enum(["manual", "gap_fill"]).optional(),
        })
        .and(manualWindow)
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await db
        .select({ id: projects.id, clientId: projects.clientId })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)))
        .limit(1);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      }

      const [row] = await db
        .insert(timeEntries)
        .values({
          userId: ctx.userId,
          projectId: project.id,
          taskId: null,
          description: input.description ?? null,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          reason: null,
          source: input.source ?? "manual",
          billable: project.clientId != null,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create time entry.",
        });
      }

      return { entryId: row.id };
    }),

  /**
   * Live inputs for the three data-driven W2d alerts (client-20h, project over
   * estimate, weekly hours). Aggregated in JS rather than SQL so the same code path
   * serves Postgres and the desktop SQLite mirror. The client-side notifier turns
   * this snapshot into fire/don't-fire decisions (see selectThresholdAlerts).
   */
  getThresholdAlerts: protectedProcedure
    .input(z.object({ tzOffsetMinutes: z.number().int().min(-840).max(840) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const { start: weekStart } = localWeekUtcBounds(now, input.tzOffsetMinutes);
      const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [entries, projectRows, clientRows, taskRows] = await Promise.all([
        db
          .select({
            projectId: timeEntries.projectId,
            startedAt: timeEntries.startedAt,
            endedAt: timeEntries.endedAt,
            billable: timeEntries.billable,
            invoicedAt: timeEntries.invoicedAt,
          })
          .from(timeEntries)
          .where(eq(timeEntries.userId, ctx.userId)),
        db
          .select({ id: projects.id, name: projects.name, clientId: projects.clientId })
          .from(projects)
          .where(and(eq(projects.userId, ctx.userId), isNull(projects.archivedAt))),
        db
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(eq(clients.userId, ctx.userId)),
        db
          .select({ projectId: tasks.projectId, estimate: tasks.timeEstimateMinutes })
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, ctx.userId),
              isNotNull(tasks.projectId),
              isNotNull(tasks.timeEstimateMinutes)
            )
          ),
      ]);

      const seconds = (e: { startedAt: Date; endedAt: Date | null }) =>
        Math.max(0, Math.floor(((e.endedAt ?? now).getTime() - e.startedAt.getTime()) / 1000));

      const projectClient = new Map(projectRows.map((p) => [p.id, p.clientId]));
      const projectName = new Map(projectRows.map((p) => [p.id, p.name]));
      const clientName = new Map(clientRows.map((c) => [c.id, c.name]));

      const billableByClient = new Map<string, number>();
      const actualByProject = new Map<string, number>();
      let lastWeekWorkedSeconds = 0;

      for (const e of entries) {
        const s = seconds(e);
        actualByProject.set(e.projectId, (actualByProject.get(e.projectId) ?? 0) + s);
        if (e.billable && e.invoicedAt == null) {
          const clientId = projectClient.get(e.projectId);
          if (clientId) billableByClient.set(clientId, (billableByClient.get(clientId) ?? 0) + s);
        }
        if (e.startedAt >= lastWeekStart && e.startedAt < weekStart) lastWeekWorkedSeconds += s;
      }

      const estimateByProject = new Map<string, number>();
      for (const t of taskRows) {
        if (t.projectId == null || t.estimate == null) continue;
        estimateByProject.set(
          t.projectId,
          (estimateByProject.get(t.projectId) ?? 0) + t.estimate * 60
        );
      }

      return {
        clients: Array.from(billableByClient, ([clientId, sec]) => ({
          clientId,
          name: clientName.get(clientId) ?? "Client",
          billableUnbilledSeconds: sec,
        })),
        projects: Array.from(actualByProject, ([projectId, actualSeconds]) => ({
          projectId,
          name: projectName.get(projectId) ?? "Project",
          estimateSeconds: estimateByProject.get(projectId) ?? 0,
          actualSeconds,
        })).filter((p) => p.estimateSeconds > 0),
        lastWeekWorkedSeconds,
        isoWeek: weekStart.toISOString().slice(0, 10),
      };
    }),

  /**
   * Time report for a period (W3): totals, the business/personal split, the
   * client → project → task tree, and the effective hourly rate. Fetches the raw
   * inputs and hands them to the pure `aggregateTimeReport`.
   */
  report: protectedProcedure
    .input(z.object({ startedAt: z.coerce.date(), endedAt: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();

      const [entryRows, projectRows, clientRows, taskRows, rateRows] = await Promise.all([
        db
          .select({
            projectId: timeEntries.projectId,
            taskId: timeEntries.taskId,
            billable: timeEntries.billable,
            startedAt: timeEntries.startedAt,
            endedAt: timeEntries.endedAt,
          })
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.userId, ctx.userId),
              gte(timeEntries.startedAt, input.startedAt),
              lt(timeEntries.startedAt, input.endedAt)
            )
          ),
        db
          .select({
            id: projects.id,
            name: projects.name,
            clientId: projects.clientId,
            category: projects.category,
          })
          .from(projects)
          .where(eq(projects.userId, ctx.userId)),
        db
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(eq(clients.userId, ctx.userId)),
        db
          .select({ id: tasks.id, title: tasks.title })
          .from(tasks)
          .where(eq(tasks.userId, ctx.userId)),
        db
          .select({
            clientId: rates.clientId,
            projectId: rates.projectId,
            amountCents: rates.amountCents,
            effectiveFrom: rates.effectiveFrom,
          })
          .from(rates)
          .where(eq(rates.userId, ctx.userId)),
      ]);

      const ratesByClient = new Map<string, CandidateRate[]>();
      for (const rate of rateRows) {
        const list = ratesByClient.get(rate.clientId) ?? [];
        list.push({
          projectId: rate.projectId,
          amountCents: rate.amountCents,
          effectiveFrom: rate.effectiveFrom,
        });
        ratesByClient.set(rate.clientId, list);
      }

      return aggregateTimeReport({
        entries: entryRows.map((e) => ({
          projectId: e.projectId,
          taskId: e.taskId,
          billable: e.billable,
          seconds: Math.max(
            0,
            Math.floor(((e.endedAt ?? now).getTime() - e.startedAt.getTime()) / 1000)
          ),
        })),
        projects: projectRows,
        clients: clientRows,
        tasks: taskRows,
        ratesByClient,
        asOf: now,
      });
    }),

  /**
   * Raw entries for a period, joined out to their client / project / task / tag —
   * the one row shape the CSV export, W3 reporting, and W4 invoices all read.
   * Duration is left to the caller (elapsed is always derived).
   */
  exportRows: protectedProcedure
    .input(z.object({ startedAt: z.coerce.date(), endedAt: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      return db
        .select({
          startedAt: timeEntries.startedAt,
          endedAt: timeEntries.endedAt,
          clientName: clients.name,
          projectName: projects.name,
          taskTitle: tasks.title,
          tagName: timeTags.name,
          description: timeEntries.description,
          billable: timeEntries.billable,
          invoicedAt: timeEntries.invoicedAt,
        })
        .from(timeEntries)
        .innerJoin(projects, eq(timeEntries.projectId, projects.id))
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
        .leftJoin(timeTags, eq(timeEntries.tagId, timeTags.id))
        .where(
          and(
            eq(timeEntries.userId, ctx.userId),
            gte(timeEntries.startedAt, input.startedAt),
            lt(timeEntries.startedAt, input.endedAt)
          )
        )
        .orderBy(desc(timeEntries.startedAt));
    }),

  delete: protectedProcedure
    .input(z.object({ entryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(timeEntries)
        .where(and(eq(timeEntries.id, input.entryId), eq(timeEntries.userId, ctx.userId)))
        .returning({ id: timeEntries.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Time entry not found." });
      }

      return { entryId: row.id };
    }),
});
