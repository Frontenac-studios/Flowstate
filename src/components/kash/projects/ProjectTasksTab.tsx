"use client";

import { useEffect, useMemo, useState } from "react";

import { InPageSwitcher } from "@/components/kash/InPageSwitcher";
import TaskDetailSheet from "@/components/kash/plan/TaskDetailSheet";
import { TaskRow, type PlanTaskRow } from "@/components/kash/plan/TaskRow";
import { Check, ChevronRight, Layers, Minus, Tag } from "@/components/kash/ui/icon";
import { useSessionUndo } from "@/hooks/useSessionUndo";
import { useTagStyles } from "@/hooks/useTagStyles";
import { cn } from "@/lib/cn";
import {
  applyTagFilter,
  cycleTagFilter,
  groupTasksByPhase,
  groupTasksByWeek,
  tagCounts,
  type TagFilter,
} from "@/lib/projects/project-task-groups";
import { resolveTagStyle, tagColorVars } from "@/lib/tasks/tag-styles";

import ProjectRail from "./ProjectRail";
import type { ProjectDetail, ProjectPhase, ProjectTask } from "./types";

type GroupBy = "phase" | "week";
const GROUP_BY_KEY = "kash.project.groupBy";
const GROUP_OPTIONS = [
  { value: "phase" as const, label: "Phase" },
  { value: "week" as const, label: "Week" },
];

function toRow(task: ProjectTask, project: ProjectDetail, phaseName: string | null): PlanTaskRow {
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    projectId: project.id,
    projectSlug: project.slug,
    projectName: project.name,
    projectHue: project.hue,
    isTop3: task.isTop3,
    category: task.category,
    categoryUnresolved: task.categoryUnresolved,
    tags: task.tags,
    isBlocked: task.isBlocked,
    blockedByIds: task.blockedByIds,
    scheduledDate: task.scheduledDate,
    dueDate: task.dueDate,
    suggestedScheduledDate: task.suggestedScheduledDate,
    phaseName,
  };
}

/** RailA tag list: 36px rows, dot, name, count; include = filled + ✓, exclude = struck. */
function TagList({
  tags,
  filter,
  onToggle,
}: {
  tags: { tag: string; count: number }[];
  filter: TagFilter;
  onToggle: (tag: string) => void;
}) {
  const styles = useTagStyles();
  if (tags.length === 0) {
    return <p className="text-meta text-ink-muted">No tags in this project yet.</p>;
  }
  return (
    <>
      <ul className="-mx-3 flex flex-col gap-0.5">
        {tags.map(({ tag, count }) => {
          const state = filter[tag.toLowerCase()];
          const dot = tagColorVars(resolveTagStyle(tag, styles).color).dot;
          return (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onToggle(tag)}
                aria-pressed={state === "include" ? true : state === "exclude" ? "mixed" : false}
                title={
                  state === "include"
                    ? "Showing only these — click to exclude"
                    : state === "exclude"
                      ? "Excluded — click to clear"
                      : "Show only tasks with this tag"
                }
                className={cn(
                  "kash-focus-row flex h-9 w-full items-center gap-2.5 rounded-row px-3 text-left text-[14px] outline-none transition-colors hover:bg-tint-hover",
                  state ? "bg-menu-divider font-semibold" : "font-medium"
                )}
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: dot }}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    state === "exclude" && "text-ink-muted line-through"
                  )}
                >
                  {tag}
                </span>
                <span className="text-meta font-normal tabular-nums text-ink-muted">{count}</span>
                {state === "include" ? <Check size={14} aria-hidden /> : null}
                {state === "exclude" ? <Minus size={14} aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-meta text-ink-muted">Click again to exclude</p>
    </>
  );
}

/**
 * Spec v4 Tasks tab (GroupC grouping + RailA rail): the project's open tasks grouped
 * by Phase or Week as white cards, no toolbar; Group by and the tag filter live in
 * the rail. Rows are the standard task row; a click opens the detail sheet.
 */
export default function ProjectTasksTab({
  project,
  phases,
  tasks,
}: {
  project: ProjectDetail;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>("phase");
  const [filter, setFilter] = useState<TagFilter>({});
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [showUndated, setShowUndated] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const { pushComplete, pushDelete } = useSessionUndo();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(GROUP_BY_KEY);
      if (saved === "phase" || saved === "week") setGroupBy(saved);
    } catch {
      /* private mode */
    }
  }, []);

  function changeGroupBy(next: GroupBy) {
    setGroupBy(next);
    try {
      window.localStorage.setItem(GROUP_BY_KEY, next);
    } catch {
      /* private mode */
    }
  }

  const open = useMemo(() => tasks.filter((t) => t.completedAt == null), [tasks]);
  const done = useMemo(
    () =>
      tasks
        .filter((t) => t.completedAt != null)
        .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)),
    [tasks]
  );
  const counts = useMemo(() => tagCounts(open), [open]);
  const visible = useMemo(() => applyTagFilter(open, filter), [open, filter]);
  const grouped = useMemo(
    () =>
      groupBy === "phase"
        ? groupTasksByPhase(visible, phases)
        : groupTasksByWeek(visible, new Date()),
    [groupBy, visible, phases]
  );
  const phaseName = useMemo(() => {
    const byId = new Map(phases.map((p) => [p.id, p.name]));
    return (id: string | null) => (id ? (byId.get(id) ?? null) : null);
  }, [phases]);

  const renderRows = (list: ProjectTask[]) => (
    <ul className="divide-y divide-menu-divider rounded-card bg-surface px-3 py-2">
      {list.map((task) => (
        <TaskRow
          key={task.id}
          task={toRow(task, project, groupBy === "week" ? phaseName(task.phaseId) : null)}
          onOpenDetail={setDetailTaskId}
          onComplete={pushComplete}
          onDelete={pushDelete}
          showProject={false}
        />
      ))}
    </ul>
  );

  const filtering = Object.keys(filter).length > 0;

  return (
    <div className="flex min-w-0 flex-1 gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {grouped.groups.length === 0 && grouped.undated.length === 0 ? (
          <p className="rounded-card bg-surface px-4 py-8 text-center text-body text-ink-muted">
            {filtering
              ? "No open tasks match these tags."
              : open.length === 0 && done.length > 0
                ? "Every task here is done."
                : "No tasks yet — Add task starts the list."}
          </p>
        ) : null}

        {grouped.groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-2">
            <div className="flex items-baseline gap-3 px-1">
              <h3 className="text-subtitle font-semibold text-ink">{group.label}</h3>
              <span className="text-meta text-ink-muted">
                {group.sub ? `${group.sub} · ` : ""}
                {group.tasks.length}
              </span>
            </div>
            {renderRows(group.tasks)}
          </section>
        ))}

        {grouped.undated.length > 0 ? (
          <section className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowUndated((v) => !v)}
              aria-expanded={showUndated}
              className="kash-focus-visible flex items-center gap-3 self-start px-1 text-meta text-ink-muted outline-none hover:text-ink"
            >
              <span className="font-semibold">No date</span>
              <span>
                {grouped.undated.length} {grouped.undated.length === 1 ? "task" : "tasks"}
              </span>
              <ChevronRight
                size={14}
                className={cn("transition-transform", showUndated && "rotate-90")}
              />
            </button>
            {showUndated ? renderRows(grouped.undated) : null}
          </section>
        ) : null}

        {done.length > 0 ? (
          <section className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              aria-expanded={showDone}
              className="kash-focus-visible flex items-center gap-1.5 self-start px-1 text-meta font-semibold text-ink-muted outline-none hover:text-ink"
            >
              <ChevronRight
                size={14}
                className={cn("transition-transform", showDone && "rotate-90")}
              />
              {done.length} done
            </button>
            {showDone ? (
              <ul className="divide-y divide-menu-divider rounded-card bg-surface px-5 py-1">
                {done.map((task) => (
                  <li
                    key={task.id}
                    className="flex min-h-11 items-center gap-3 text-body text-ink-faint line-through"
                  >
                    {task.title}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>

      <ProjectRail
        sections={[
          {
            key: "group",
            label: "Group by",
            icon: Layers,
            content: (
              <InPageSwitcher
                options={GROUP_OPTIONS}
                value={groupBy}
                onChange={changeGroupBy}
                ariaLabel="Group tasks by"
                fullWidth
              />
            ),
          },
          {
            key: "tags",
            label: "Tags",
            icon: Tag,
            content: (
              <TagList
                tags={counts}
                filter={filter}
                onToggle={(tag) => setFilter((f) => cycleTagFilter(f, tag))}
              />
            ),
          },
        ]}
      />

      <TaskDetailSheet
        taskId={detailTaskId}
        onClose={() => setDetailTaskId(null)}
        onDeleted={pushDelete}
      />
    </div>
  );
}
