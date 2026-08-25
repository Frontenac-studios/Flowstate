import { RateNotFoundError, resolveRateCents, type CandidateRate } from "@/lib/rates/resolve-rate";

/**
 * Time reporting roll-up (W3): totals, the business/personal split, the
 * client → project → task tree, and the effective hourly rate. Pure so it can be
 * checked against a hand-computed fixture.
 *
 * Rounding, stated once and applied everywhere: time is summed to the second and
 * shown in decimal hours; revenue is computed from exact seconds and rounded to
 * whole cents only at the totals. Rounding to 0.25h is an invoice concern (W4),
 * never a reporting one — so the effective rate here is honest.
 *
 * The effective rate is billable REVENUE ÷ ALL hours worked (MISSION.md), so
 * non-billable and unrated time correctly drags it down.
 */

export type ProjectCategory = "business" | "personal";

export type ReportEntry = {
  projectId: string;
  taskId: string | null;
  billable: boolean;
  seconds: number;
};
export type ReportProject = {
  id: string;
  name: string;
  clientId: string | null;
  category: ProjectCategory;
};
export type ReportClient = { id: string; name: string };
export type ReportTask = { id: string; title: string };

export type ReportTaskNode = {
  taskId: string | null;
  title: string;
  seconds: number;
  billableSeconds: number;
};
export type ReportProjectNode = {
  projectId: string;
  name: string;
  category: ProjectCategory;
  seconds: number;
  billableSeconds: number;
  revenueCents: number;
  tasks: ReportTaskNode[];
};
export type ReportClientNode = {
  clientId: string | null;
  name: string;
  seconds: number;
  billableSeconds: number;
  revenueCents: number;
  projects: ReportProjectNode[];
};

export type TimeReport = {
  totals: {
    totalSeconds: number;
    billableSeconds: number;
    nonBillableSeconds: number;
    businessSeconds: number;
    personalSeconds: number;
  };
  revenueCents: number;
  effectiveRateCents: number;
  clients: ReportClientNode[];
};

const NO_CLIENT = "__none__";
const NO_TASK = "__none__";

export function aggregateTimeReport(params: {
  entries: ReportEntry[];
  projects: ReportProject[];
  clients: ReportClient[];
  tasks: ReportTask[];
  ratesByClient: Map<string, CandidateRate[]>;
  asOf: Date;
}): TimeReport {
  const projectById = new Map(params.projects.map((p) => [p.id, p]));
  const clientNameById = new Map(params.clients.map((c) => [c.id, c.name]));
  const taskTitleById = new Map(params.tasks.map((t) => [t.id, t.title]));

  const totals = {
    totalSeconds: 0,
    billableSeconds: 0,
    nonBillableSeconds: 0,
    businessSeconds: 0,
    personalSeconds: 0,
  };
  let revenueCentsFloat = 0;

  // clientKey -> project map -> task map
  const clientNodes = new Map<string, ReportClientNode>();
  const projectNodes = new Map<string, ReportProjectNode>();
  const taskNodes = new Map<string, ReportTaskNode>();

  for (const entry of params.entries) {
    const project = projectById.get(entry.projectId);
    if (!project) continue; // an entry must have a project; skip an orphan defensively
    const clientKey = project.clientId ?? NO_CLIENT;
    const taskKey = entry.taskId ?? NO_TASK;

    totals.totalSeconds += entry.seconds;
    if (entry.billable) totals.billableSeconds += entry.seconds;
    else totals.nonBillableSeconds += entry.seconds;
    if (project.category === "business") totals.businessSeconds += entry.seconds;
    else totals.personalSeconds += entry.seconds;

    let entryRevenue = 0;
    if (entry.billable && project.clientId) {
      try {
        const rate = resolveRateCents(
          project.id,
          params.ratesByClient.get(project.clientId) ?? [],
          params.asOf
        );
        entryRevenue = (entry.seconds / 3600) * rate;
      } catch (err) {
        if (!(err instanceof RateNotFoundError)) throw err;
        // Unrated billable time earns no revenue but still counts as hours worked.
      }
    }
    revenueCentsFloat += entryRevenue;

    // Client node
    let clientNode = clientNodes.get(clientKey);
    if (!clientNode) {
      clientNode = {
        clientId: project.clientId,
        name: project.clientId ? (clientNameById.get(project.clientId) ?? "Client") : "No client",
        seconds: 0,
        billableSeconds: 0,
        revenueCents: 0,
        projects: [],
      };
      clientNodes.set(clientKey, clientNode);
    }
    clientNode.seconds += entry.seconds;
    if (entry.billable) clientNode.billableSeconds += entry.seconds;
    clientNode.revenueCents += entryRevenue;

    // Project node
    let projectNode = projectNodes.get(project.id);
    if (!projectNode) {
      projectNode = {
        projectId: project.id,
        name: project.name,
        category: project.category,
        seconds: 0,
        billableSeconds: 0,
        revenueCents: 0,
        tasks: [],
      };
      projectNodes.set(project.id, projectNode);
      clientNode.projects.push(projectNode);
    }
    projectNode.seconds += entry.seconds;
    if (entry.billable) projectNode.billableSeconds += entry.seconds;
    projectNode.revenueCents += entryRevenue;

    // Task node (scoped to its project)
    const taskNodeKey = `${project.id}:${taskKey}`;
    let taskNode = taskNodes.get(taskNodeKey);
    if (!taskNode) {
      taskNode = {
        taskId: entry.taskId,
        title: entry.taskId ? (taskTitleById.get(entry.taskId) ?? "Task") : "No task",
        seconds: 0,
        billableSeconds: 0,
      };
      taskNodes.set(taskNodeKey, taskNode);
      projectNode.tasks.push(taskNode);
    }
    taskNode.seconds += entry.seconds;
    if (entry.billable) taskNode.billableSeconds += entry.seconds;
  }

  // Round the accumulated revenue to whole cents, at the leaves and the totals.
  const clientList = Array.from(clientNodes.values());
  for (const clientNode of clientList) {
    clientNode.revenueCents = Math.round(clientNode.revenueCents);
    for (const projectNode of clientNode.projects) {
      projectNode.revenueCents = Math.round(projectNode.revenueCents);
      projectNode.tasks.sort((a, b) => b.seconds - a.seconds);
    }
    clientNode.projects.sort((a, b) => b.seconds - a.seconds);
  }

  const revenueCents = Math.round(revenueCentsFloat);
  const effectiveRateCents =
    totals.totalSeconds > 0 ? Math.round((revenueCentsFloat * 3600) / totals.totalSeconds) : 0;

  return {
    totals,
    revenueCents,
    effectiveRateCents,
    clients: clientList.sort((a, b) => b.seconds - a.seconds),
  };
}
