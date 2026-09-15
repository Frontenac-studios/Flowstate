import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

/**
 * Router output → what an MCP tool returns (W18c).
 *
 * An MCP client can't see the screen, so every tool answer has to stand on its own:
 * names instead of bare ids where a person would say a name, dates as YYYY-MM-DD,
 * money in currency units rather than cents, and nothing the app only needs for
 * rendering (sort orders, dot colours, drag state). Pure — no database, no auth — so
 * the shapes are pinned by unit tests rather than by a live endpoint.
 */
type Outputs = inferRouterOutputs<AppRouter>;
export type ProjectListRow = Outputs["projects"]["list"][number];
export type ClientListRow = Outputs["clients"]["list"][number];
export type ProjectRow = Outputs["projects"]["getById"];
export type PhaseRow = Outputs["phases"]["listByProject"][number];
export type ProjectTaskRow = Outputs["tasks"]["listByProject"][number];
export type OpenTaskRow = Outputs["tasks"]["listIncomplete"][number];
export type BurnRow = Outputs["projects"]["burn"][number];

const PRIORITY_WORD: Record<number, string> = { 1: "low", 2: "medium", 3: "high" };

function priorityWord(priority: number): string | undefined {
  return PRIORITY_WORD[priority];
}

/** A stored timestamp as the calendar day it fell on, in UTC. */
function isoDay(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function centsToUnits(cents: number | null | undefined): number | null {
  return cents == null ? null : Math.round(cents) / 100;
}

function hours(seconds: number): number {
  return Math.round((seconds / 3600) * 10) / 10;
}

export function clientNameMap(clients: ReadonlyArray<ClientListRow>): Map<string, string> {
  return new Map(clients.map((client) => [client.id, client.name]));
}

// ---------------------------------------------------------------------------
// Resolving "the project she means" from an id or a name.

export type ProjectMatch =
  | { kind: "found"; id: string }
  | { kind: "none" }
  | { kind: "ambiguous"; candidates: { id: string; name: string }[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Accepts an id, an exact name (any case), or a fragment that matches exactly one
 * project. Claude usually knows the name from the conversation, not the id, and one
 * fewer round trip through `list_projects` is worth the small amount of matching.
 */
export function matchProject(
  query: string,
  projects: ReadonlyArray<{ id: string; name: string }>
): ProjectMatch {
  const q = query.trim();
  if (!q) return { kind: "none" };
  if (UUID.test(q)) {
    return projects.some((p) => p.id === q) ? { kind: "found", id: q } : { kind: "none" };
  }
  const lower = q.toLowerCase();
  const exact = projects.filter((p) => p.name.toLowerCase() === lower);
  if (exact.length === 1) return { kind: "found", id: exact[0]!.id };
  const partial =
    exact.length > 1 ? exact : projects.filter((p) => p.name.toLowerCase().includes(lower));
  if (partial.length === 1) return { kind: "found", id: partial[0]!.id };
  if (partial.length === 0) return { kind: "none" };
  return {
    kind: "ambiguous",
    candidates: partial.slice(0, 8).map((p) => ({ id: p.id, name: p.name })),
  };
}

// ---------------------------------------------------------------------------
// list_projects

export function shapeProjectList(
  projects: ReadonlyArray<ProjectListRow>,
  clients: ReadonlyArray<ClientListRow>
) {
  const clientName = clientNameMap(clients);
  return {
    count: projects.length,
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      client: project.clientId ? (clientName.get(project.clientId) ?? null) : null,
      state: project.state,
      category: project.category,
      billing: project.billingType,
      ...(project.isLearning ? { learning: true } : {}),
      progress_pct: project.percent,
      tasks_done: project.completedCount,
      tasks_total: project.taskCount,
      next_due: project.nextDueDate,
      hours_logged: hours(project.timeSpentSeconds),
      last_activity: isoDay(project.lastActivityAt),
    })),
  };
}

// ---------------------------------------------------------------------------
// get_project — the whole tree in one answer

function shapeTask(task: ProjectTaskRow | OpenTaskRow) {
  const priority = priorityWord(task.priority);
  return {
    id: task.id,
    title: task.title,
    due: task.scheduledDate ?? null,
    ...(priority ? { priority } : {}),
    ...(task.isTop3 ? { top3: true } : {}),
    done: task.completedAt != null,
  };
}

type PhaseNode = {
  id: string;
  name: string;
  start: string | null;
  end: string | null;
  estimate_hours: number | null;
  done: boolean;
  tasks: ReturnType<typeof shapeTask>[];
  phases: PhaseNode[];
};

export function shapeProjectTree(
  project: ProjectRow,
  phases: ReadonlyArray<PhaseRow>,
  tasks: ReadonlyArray<ProjectTaskRow>,
  clientName: string | null
) {
  const nodes = new Map<string, PhaseNode>();
  for (const phase of phases) {
    nodes.set(phase.id, {
      id: phase.id,
      name: phase.name,
      start: phase.startDate ?? null,
      end: phase.endDate ?? null,
      estimate_hours: phase.estimateHours ?? null,
      done: phase.completedAt != null,
      tasks: [],
      phases: [],
    });
  }

  const roots: PhaseNode[] = [];
  for (const phase of phases) {
    const node = nodes.get(phase.id)!;
    const parent = phase.parentPhaseId ? nodes.get(phase.parentPhaseId) : undefined;
    if (parent) parent.phases.push(node);
    else roots.push(node);
  }

  const unphased: ReturnType<typeof shapeTask>[] = [];
  for (const task of tasks) {
    const shaped = shapeTask(task);
    const home = task.phaseId ? nodes.get(task.phaseId) : undefined;
    if (home) home.tasks.push(shaped);
    else unphased.push(shaped);
  }

  const done = tasks.filter((task) => task.completedAt != null).length;
  return {
    id: project.id,
    name: project.name,
    client: clientName,
    state: project.state,
    category: project.category,
    billing: project.billingType,
    ...(project.why ? { why: project.why } : {}),
    tasks_done: done,
    tasks_total: tasks.length,
    phases: roots,
    unphased_tasks: unphased,
  };
}

// ---------------------------------------------------------------------------
// list_clients

export function shapeClients(clients: ReadonlyArray<ClientListRow>) {
  return {
    count: clients.length,
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      currency: client.currency,
      hourly_rate: centsToUnits(client.defaultRateCents),
      billing_threshold_hours: client.billingThresholdHours ?? null,
      ...(client.notes ? { notes: client.notes.slice(0, 500) } : {}),
    })),
  };
}

// ---------------------------------------------------------------------------
// list_tasks

export type TaskFilter = {
  projectId?: string;
  /** Inclusive YYYY-MM-DD bounds on the scheduled date. */
  from?: string;
  to?: string;
  /** Keep tasks with no date. Defaults to true without a range, false with one. */
  includeUnscheduled?: boolean;
  limit: number;
};

export function shapeOpenTasks(tasks: ReadonlyArray<OpenTaskRow>, filter: TaskFilter) {
  const ranged = filter.from != null || filter.to != null;
  const keepUnscheduled = filter.includeUnscheduled ?? !ranged;

  const matching = tasks.filter((task) => {
    if (filter.projectId && task.projectId !== filter.projectId) return false;
    const due = task.scheduledDate;
    if (!due) return keepUnscheduled;
    if (filter.from && due < filter.from) return false;
    if (filter.to && due > filter.to) return false;
    return true;
  });

  // Dated work first, soonest first; undated after, as the app already orders them.
  const ordered = [...matching].sort((a, b) => {
    if (a.scheduledDate && b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
    if (a.scheduledDate) return -1;
    if (b.scheduledDate) return 1;
    return 0;
  });

  const page = ordered.slice(0, filter.limit);
  return {
    count: matching.length,
    ...(matching.length > page.length ? { truncated: true, shown: page.length } : {}),
    tasks: page.map((task) => ({
      ...shapeTask(task),
      project: task.projectName ?? null,
      phase: task.phaseName ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// get_burn

function shapeBurnNumbers(burn: BurnRow["burn"]["total"]) {
  return {
    estimate_hours: burn.estimateHours,
    actual_hours: burn.actualHours,
    consumed_pct: burn.consumedPct,
    completed_pct: burn.completedPct,
    ahead_by_pct: burn.aheadByPct,
    state: burn.state,
  };
}

export function shapeBurn(rows: ReadonlyArray<BurnRow>) {
  const estimated = rows.filter((row) => row.burn.estimatedPhaseCount > 0).length;
  return {
    count: rows.length,
    ...(estimated === 0
      ? {
          note:
            "No phase has an hour estimate yet, so there is no budget to burn against. " +
            "Hours logged are still shown.",
        }
      : {}),
    projects: rows.map((row) => ({
      project_id: row.projectId,
      project: row.projectName,
      billing: row.billingType,
      ...shapeBurnNumbers(row.burn.total),
      estimated_phases: row.burn.estimatedPhaseCount,
      hot_phases: row.burn.hotPhaseCount,
      message: row.message,
      ...(row.fee
        ? {
            fee: {
              effective_rate_per_hour: centsToUnits(row.fee.effectiveRateCents),
              rate_floor_per_hour: centsToUnits(row.fee.targetRateFloorCents),
              below_floor: row.fee.belowFloor,
              hours_until_floor: row.fee.hoursUntilFloor,
            },
          }
        : {}),
      phases: row.burn.phases.map((phase) => ({
        name: phase.phaseName,
        ...shapeBurnNumbers(phase.burn),
      })),
    })),
  };
}
