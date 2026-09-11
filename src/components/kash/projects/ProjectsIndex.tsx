"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { ColoredEmptyInvitation } from "@/components/kash/ui/ColoredEmptyInvitation";
import { QueryErrorNotice } from "@/components/kash/ui/QueryErrorNotice";
import Button from "@/components/kash/ui/Button";
import { OPEN_NEW_PROJECT_EVENT } from "@/components/kash/chrome-events";
import { useTRPC } from "@/trpc/client";

import { InPageSwitcher } from "../InPageSwitcher";
import SourcingPipeline from "./SourcingPipeline";
import { FLAGS } from "@/lib/flags";
import CompletedProjectsSection from "./CompletedProjectsSection";
import LooseTasksCard from "./LooseTasksCard";
import MultiProjectCalendarView from "./MultiProjectCalendarView";
import ProjectsStatusTable, { type ProjectStatusRow } from "./ProjectsStatusTable";
import { useProjectFoldTransitions } from "./useProjectFoldTransitions";

import "./projects-motion.css";

type IndexViewMode = "list" | "calendar" | "pipeline";

function openNewProject() {
  window.dispatchEvent(new CustomEvent(OPEN_NEW_PROJECT_EVENT));
}

/**
 * The Projects index (Kash 3.2, decision 6B).
 *
 * The card gallery became a status table: with four to seven projects the whole
 * business fits above the fold, and `state` — which has existed on the row since W1
 * with no display anywhere in the app — finally has a reader. A prospect sitting in
 * the active list looking identical to live client work is the kind of quiet
 * inaccuracy the mission is built against.
 *
 * Creating is no longer owned by this screen. The button dispatches the same event
 * the command palette and the `n` shortcut do, and the dialog lives at the shell.
 */
export default function ProjectsIndex() {
  const trpc = useTRPC();
  const {
    data: projects,
    isLoading,
    isError,
    refetch: refetchProjects,
  } = useQuery(trpc.projects.list.queryOptions());
  const { data: looseByCategory = [] } = useQuery(
    trpc.projects.listLooseTaskCountsByCategory.queryOptions()
  );
  const { data: clients = [] } = useQuery(trpc.clients.list.queryOptions({}));
  const { data: burnReads = [] } = useQuery(trpc.projects.burn.queryOptions({}));

  const [indexView, setIndexView] = useState<IndexViewMode>("list");

  const projectCount = projects?.length ?? 0;
  const totalLooseCount = useMemo(
    () => looseByCategory.reduce((sum, row) => sum + row.count, 0),
    [looseByCategory]
  );
  const hasProjects = projectCount > 0;
  const hasContent = hasProjects || totalLooseCount > 0;

  const allVisible = useMemo(() => projects ?? [], [projects]);
  const { activeProjects, completedProjects } = useProjectFoldTransitions(allVisible);

  const clientNameById = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients]
  );
  const burnByProjectId = useMemo(
    () => new Map(burnReads.map((read) => [read.projectId, read])),
    [burnReads]
  );

  const statusRows = useMemo<ProjectStatusRow[]>(
    () =>
      [...activeProjects]
        .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
        .map((project) => {
          const burn = burnByProjectId.get(project.id)?.burn;
          return {
            id: project.id,
            name: project.name,
            category: project.category,
            state: project.state,
            percent: project.percent,
            taskCount: project.taskCount,
            clientName: project.clientId ? (clientNameById.get(project.clientId) ?? null) : null,
            nextDueDate: project.nextDueDate,
            actualHours: burn?.total.actualHours ?? project.timeSpentSeconds / 3600,
            estimateHours: burn?.total.estimateHours ?? null,
            hot: burn?.total.state === "hot",
          };
        }),
    [activeProjects, burnByProjectId, clientNameById]
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-ink">Projects</h1>
          {hasProjects || FLAGS.sourcing ? (
            <InPageSwitcher
              options={[
                { value: "list", label: "List" },
                { value: "calendar", label: "Calendar" },
                // Pipeline (W10) — the sourcing triage board; dark unless flagged on.
                ...(FLAGS.sourcing ? [{ value: "pipeline" as const, label: "Pipeline" }] : []),
              ]}
              value={indexView}
              onChange={setIndexView}
              ariaLabel="Projects index view"
            />
          ) : null}
        </div>
        <Button type="button" onClick={openNewProject}>
          New project
        </Button>
      </div>

      {indexView === "pipeline" ? (
        <SourcingPipeline />
      ) : indexView === "calendar" ? (
        <MultiProjectCalendarView />
      ) : isError ? (
        <QueryErrorNotice
          message="Your projects didn't load."
          onRetry={() => void refetchProjects()}
        />
      ) : isLoading ? (
        <div
          className="h-40 animate-pulse rounded-card border border-subtle bg-surface-2"
          aria-busy="true"
          aria-label="Loading projects"
        />
      ) : !hasContent ? (
        <ColoredEmptyInvitation
          title="Start your first project"
          hint="Name it and open it. Phases and tasks get added on the board."
          action={
            <Button type="button" onClick={openNewProject}>
              New project
            </Button>
          }
        />
      ) : (
        <>
          {statusRows.length > 0 ? <ProjectsStatusTable rows={statusRows} /> : null}

          {totalLooseCount > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <LooseTasksCard count={totalLooseCount} />
            </div>
          ) : null}

          <CompletedProjectsSection projects={completedProjects} showTemplateFeatures={false} />
        </>
      )}
    </section>
  );
}
