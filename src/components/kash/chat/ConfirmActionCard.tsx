"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import Checkbox from "@/components/kash/ui/Checkbox";
import { ComposerCategoryAccent } from "@/components/kash/plan/ComposerCategoryAccent";
import type { CreateTaskItemEdit, ProposedAction } from "@/lib/chat/proposed-actions";
import { proposalHeadline } from "@/lib/chat/proposed-actions";
import { formatCreateTaskPlacementSummary } from "@/lib/chat/resolve-create-task-placement";
import { categoryLabel, PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/projects/categories";
import { flattenPhasesForSelect } from "@/lib/projects/flatten-phases-for-select";
import { previewLineCategory } from "@/lib/tasks/preview-line-category";
import { useTRPC } from "@/trpc/client";

type Props = {
  proposal: ProposedAction;
  busy?: boolean;
  onConfirm: (enabledItemIds: string[], editedItems?: CreateTaskItemEdit[]) => void;
  onDismiss: () => void;
};

type CreateTaskItem = Extract<ProposedAction, { kind: "create_task" }>["items"][number];

/** Per-row editable state for a create_task draft. */
type DraftRow = {
  enabled: boolean;
  title: string;
  suggestedDate: string; // "" == no suggestion (stays in inbox)
  projectSlug: string; // "" == no project
  phaseId: string; // "" == project loose when project set; "__unset__" == inherit proposal
  category: ProjectCategory | "";
  priority: number;
};

const PHASE_UNSET = "__unset__";
const PHASE_LOOSE = "";

function phaseIdFromItem(item: CreateTaskItem): string {
  if (item.phaseId === null) return PHASE_LOOSE;
  if (item.phaseId) return item.phaseId;
  return PHASE_UNSET;
}

function itemLabel(action: ProposedAction, item: ProposedAction["items"][number]): string {
  switch (action.kind) {
    case "reschedule_tasks": {
      const row = item as Extract<ProposedAction, { kind: "reschedule_tasks" }>["items"][number];
      return `${row.title} → ${row.scheduledDate}`;
    }
    case "create_task": {
      const row = item as CreateTaskItem;
      const parts = [row.title];
      const suggested = row.suggestedDate ?? row.scheduledDate;
      if (suggested) parts.push(`(${suggested})`);
      if (row.projectSlug) parts.push(`#${row.projectSlug}`);
      return parts.join(" ");
    }
    case "complete_task": {
      const row = item as Extract<ProposedAction, { kind: "complete_task" }>["items"][number];
      return row.title;
    }
    case "edit_task": {
      const row = item as Extract<ProposedAction, { kind: "edit_task" }>["items"][number];
      const parts = [row.title];
      if (row.nextTitle && row.nextTitle !== row.title) parts.push(`→ ${row.nextTitle}`);
      if (row.scheduledDate !== undefined) parts.push(`due ${row.scheduledDate ?? "unscheduled"}`);
      if (row.priority !== undefined) parts.push(`p${row.priority}`);
      return parts.join(" · ");
    }
    case "delete_task": {
      const row = item as Extract<ProposedAction, { kind: "delete_task" }>["items"][number];
      return `Delete ${row.title}`;
    }
    case "set_top3": {
      const row = item as Extract<ProposedAction, { kind: "set_top3" }>["items"][number];
      return `Slot ${row.slot}: ${row.title}`;
    }
    case "set_protected_block": {
      const row = item as Extract<ProposedAction, { kind: "set_protected_block" }>["items"][number];
      const label = row.label ?? row.category;
      return `${label} · ${row.scheduledDate}`;
    }
    case "set_day_priorities": {
      const row = item as Extract<ProposedAction, { kind: "set_day_priorities" }>["items"][number];
      return `${row.title} → priority ${row.slot} (${row.scheduledDate})`;
    }
    case "apply_balance_suggestions": {
      const row = item as Extract<
        ProposedAction,
        { kind: "apply_balance_suggestions" }
      >["items"][number];
      return `${row.taskTitle} (${row.category})`;
    }
    case "create_project": {
      const row = item as Extract<ProposedAction, { kind: "create_project" }>["items"][number];
      return `${row.name} · ${row.category}`;
    }
    case "edit_phase": {
      const row = item as Extract<ProposedAction, { kind: "edit_phase" }>["items"][number];
      return `${row.projectSlug} / ${row.phaseName}`;
    }
    case "move_task_to_phase": {
      const row = item as Extract<ProposedAction, { kind: "move_task_to_phase" }>["items"][number];
      const dest = row.phaseName ?? "no phase";
      return `${row.title} → ${dest}`;
    }
    case "replan_project_dates": {
      const row = item as Extract<
        ProposedAction,
        { kind: "replan_project_dates" }
      >["items"][number];
      const start = row.startDate;
      const end = row.endDate;
      const range =
        start && end ? `${start} → ${end}` : end ? `→ ${end}` : start ? `${start} →` : "new dates";
      const label = row.projectSlug ? `${row.projectSlug} / ${row.phaseName}` : row.phaseName;
      return row.previousEndDate
        ? `${label}: ${range} (was ${row.previousEndDate})`
        : `${label}: ${range}`;
    }
    default:
      return "Change";
  }
}

const inputClass =
  "min-w-0 rounded-control border border-border bg-surface px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none";

function CreateTaskDraftRow({
  item,
  row,
  busy,
  projects,
  categoryProjects,
  lastUsedCategory,
  onUpdate,
}: {
  item: CreateTaskItem;
  row: DraftRow;
  busy: boolean;
  projects: { id: string; slug: string; name: string; category: ProjectCategory }[];
  categoryProjects: { slug: string; category: ProjectCategory }[];
  lastUsedCategory: ProjectCategory | null;
  onUpdate: (patch: Partial<DraftRow>) => void;
}) {
  const trpc = useTRPC();
  const project = row.projectSlug ? projects.find((p) => p.slug === row.projectSlug) : undefined;
  const projectId = project?.id ?? null;

  const { data: projectPhases = [] } = useQuery({
    ...trpc.phases.listByProject.queryOptions({ projectId: projectId ?? "" }),
    enabled: Boolean(projectId),
  });

  const phaseOptions = useMemo(() => flattenPhasesForSelect(projectPhases), [projectPhases]);

  const categoryPreview = previewLineCategory(
    {
      title: row.title,
      category: row.category || null,
      projectSlug: row.projectSlug || null,
    },
    categoryProjects,
    lastUsedCategory
  );

  const resolvedPhaseName =
    row.phaseId && row.phaseId !== PHASE_UNSET && row.phaseId !== PHASE_LOOSE
      ? (projectPhases.find((p) => p.id === row.phaseId)?.name ?? item.phaseName ?? null)
      : null;

  const placementSummary = formatCreateTaskPlacementSummary({
    category: categoryPreview.category,
    categoryUnresolved: categoryPreview.unresolved,
    projectName: project?.name ?? null,
    phaseName: row.projectSlug ? resolvedPhaseName : null,
    landing: "inbox",
  });

  return (
    <ComposerCategoryAccent preview={row.enabled ? categoryPreview : null}>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`draft-${item.itemId}`}
          checked={row.enabled}
          disabled={busy}
          onChange={() => onUpdate({ enabled: !row.enabled })}
        />
        <input
          aria-label="Task title"
          className={`${inputClass} flex-1 ${row.enabled ? "" : "opacity-50"}`}
          value={row.title}
          disabled={busy || !row.enabled}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
      </div>
      <div className={`flex flex-wrap gap-1 ${row.enabled ? "" : "opacity-50"}`}>
        <select
          aria-label="Category"
          className={inputClass}
          value={row.category}
          disabled={busy || !row.enabled}
          onChange={(e) => onUpdate({ category: (e.target.value || "") as ProjectCategory | "" })}
        >
          <option value="">Auto</option>
          {PROJECT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {categoryLabel(cat)}
            </option>
          ))}
        </select>
        <input
          aria-label="Suggested date"
          type="date"
          className={inputClass}
          value={row.suggestedDate}
          disabled={busy || !row.enabled}
          onChange={(e) => onUpdate({ suggestedDate: e.target.value })}
        />
        <select
          aria-label="Project"
          className={inputClass}
          value={row.projectSlug}
          disabled={busy || !row.enabled}
          onChange={(e) =>
            onUpdate({
              projectSlug: e.target.value,
              phaseId: e.target.value ? PHASE_LOOSE : PHASE_UNSET,
            })
          }
        >
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        {row.projectSlug && projectId ? (
          <select
            aria-label="Phase"
            className={inputClass}
            value={row.phaseId === PHASE_UNSET ? PHASE_LOOSE : row.phaseId}
            disabled={busy || !row.enabled}
            onChange={(e) =>
              onUpdate({
                phaseId: e.target.value === PHASE_LOOSE ? PHASE_LOOSE : e.target.value,
              })
            }
          >
            <option value={PHASE_LOOSE}>Project loose</option>
            {phaseOptions.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.label}
              </option>
            ))}
          </select>
        ) : null}
        <select
          aria-label="Priority"
          className={inputClass}
          value={row.priority}
          disabled={busy || !row.enabled}
          onChange={(e) => onUpdate({ priority: Number(e.target.value) })}
        >
          <option value={0}>No priority</option>
          <option value={1}>P1</option>
          <option value={2}>P2</option>
          <option value={3}>P3</option>
        </select>
      </div>
      {row.enabled ? <p className="text-xs text-ink-muted">{placementSummary}</p> : null}
    </ComposerCategoryAccent>
  );
}

/** Editable create_task draft: title, placement, category, and scheduling. */
function CreateTaskDraftEditor({
  items,
  busy,
  onConfirm,
  onDismiss,
}: {
  items: CreateTaskItem[];
  busy: boolean;
  onConfirm: Props["onConfirm"];
  onDismiss: () => void;
}) {
  const trpc = useTRPC();
  const { data: projects = [] } = useQuery(trpc.projects.list.queryOptions());
  const { data: settings } = useQuery(trpc.settings.get.queryOptions());

  const [rows, setRows] = useState<Record<string, DraftRow>>(() =>
    Object.fromEntries(
      items.map((item) => [
        item.itemId,
        {
          enabled: item.enabled,
          title: item.title,
          suggestedDate: item.suggestedDate ?? item.scheduledDate ?? "",
          projectSlug: item.projectSlug ?? "",
          phaseId: phaseIdFromItem(item),
          category: item.category ?? "",
          priority: item.priority ?? 0,
        } satisfies DraftRow,
      ])
    )
  );

  const categoryProjects = useMemo(
    () => projects.map((p) => ({ slug: p.slug, category: p.category })),
    [projects]
  );

  const update = useCallback((itemId: string, patch: Partial<DraftRow>) => {
    setRows((prev) => ({ ...prev, [itemId]: { ...prev[itemId]!, ...patch } }));
  }, []);

  const enabledCount = useMemo(
    () => items.filter((i) => rows[i.itemId]?.enabled && rows[i.itemId]?.title.trim()).length,
    [items, rows]
  );

  const buildEdits = useCallback(
    (commitSuggestedDate: boolean): CreateTaskItemEdit[] =>
      items
        .filter((i) => rows[i.itemId]?.enabled && rows[i.itemId]?.title.trim())
        .map((i) => {
          const r = rows[i.itemId]!;
          const edit: CreateTaskItemEdit = {
            itemId: i.itemId,
            title: r.title.trim(),
            suggestedDate: r.suggestedDate ? r.suggestedDate : null,
            projectSlug: r.projectSlug ? r.projectSlug : null,
            priority: r.priority,
            commitSuggestedDate: commitSuggestedDate || undefined,
          };
          if (r.category) edit.category = r.category;
          if (r.projectSlug && r.phaseId !== PHASE_UNSET) {
            edit.phaseId = r.phaseId ? r.phaseId : null;
          }
          return edit;
        }),
    [items, rows]
  );

  const confirm = useCallback(
    (commitSuggestedDate = false) => {
      const edits = buildEdits(commitSuggestedDate);
      onConfirm(
        edits.map((e) => e.itemId),
        edits
      );
    },
    [buildEdits, onConfirm]
  );

  const anySuggestedDate = useMemo(
    () => items.some((i) => rows[i.itemId]?.enabled && rows[i.itemId]?.suggestedDate),
    [items, rows]
  );

  return (
    <div className="mt-2 rounded-[var(--radius-row)] border border-dashed border-border bg-surface-2 px-3 py-2 text-sm">
      <p className="mb-2 font-medium text-ink">
        Create {items.length} task{items.length === 1 ? "" : "s"} in your inbox
      </p>
      <ul className="mb-3 flex flex-col gap-3" aria-label="Draft tasks">
        {items.map((item) => (
          <li key={item.itemId} className="flex flex-col gap-1">
            <CreateTaskDraftRow
              item={item}
              row={rows[item.itemId]!}
              busy={busy}
              projects={projects}
              categoryProjects={categoryProjects}
              lastUsedCategory={settings?.lastUsedCategory ?? null}
              onUpdate={(patch) => update(item.itemId, patch)}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || enabledCount === 0}
          onClick={() => confirm(false)}
          className="rounded-control border-emphasis border-ink px-3 py-1 text-xs text-ink transition hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] disabled:opacity-50"
        >
          Add to inbox
          {enabledCount > 0 && enabledCount < items.length ? ` ${enabledCount}` : ""}
        </button>
        {anySuggestedDate ? (
          <button
            type="button"
            disabled={busy || enabledCount === 0}
            onClick={() => confirm(true)}
            className="rounded-control border border-border px-3 py-1 text-xs text-ink transition hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] disabled:opacity-50"
          >
            Apply &amp; schedule
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onDismiss}
          className="rounded-control border border-border px-3 py-1 text-xs text-ink-muted transition hover:text-ink disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function ConfirmActionCard({ proposal, busy = false, onConfirm, onDismiss }: Props) {
  const [enabledIds, setEnabledIds] = useState<Set<string>>(
    () => new Set(proposal.items.map((item) => item.itemId))
  );

  const toggleItem = useCallback((itemId: string) => {
    setEnabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const enabledCount = useMemo(
    () => proposal.items.filter((item) => enabledIds.has(item.itemId)).length,
    [enabledIds, proposal.items]
  );

  if (proposal.status !== "pending") return null;

  // create_task drafts are fully editable inline; every other kind is toggle-only.
  if (proposal.kind === "create_task") {
    return (
      <CreateTaskDraftEditor
        items={proposal.items}
        busy={busy}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />
    );
  }

  return (
    <div className="mt-2 rounded-[var(--radius-row)] border border-dashed border-border bg-surface-2 px-3 py-2 text-sm">
      <p className="mb-2 font-medium text-ink">{proposalHeadline(proposal)}</p>
      <ul className="mb-3 flex flex-col gap-1.5" aria-label="Proposed changes">
        {proposal.items.map((item) => {
          const checked = enabledIds.has(item.itemId);
          return (
            <li key={item.itemId} className="flex items-start gap-2">
              <Checkbox
                id={`proposal-${item.itemId}`}
                checked={checked}
                disabled={busy}
                onChange={() => toggleItem(item.itemId)}
              />
              <label
                htmlFor={`proposal-${item.itemId}`}
                className={checked ? "text-ink" : "text-ink-muted line-through"}
              >
                {itemLabel(proposal, item)}
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || enabledCount === 0}
          onClick={() =>
            onConfirm(proposal.items.filter((i) => enabledIds.has(i.itemId)).map((i) => i.itemId))
          }
          className="rounded-control border-emphasis border-ink px-3 py-1 text-xs text-ink transition hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] disabled:opacity-50"
        >
          Confirm
          {enabledCount > 0 && enabledCount < proposal.items.length ? ` ${enabledCount}` : ""}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDismiss}
          className="rounded-control border border-border px-3 py-1 text-xs text-ink-muted transition hover:text-ink disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
