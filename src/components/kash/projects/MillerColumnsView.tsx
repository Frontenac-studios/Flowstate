"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ColoredEmptyInvitation } from "@/components/kash/ui/ColoredEmptyInvitation";
import Button from "@/components/kash/ui/Button";
import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import type { ProjectCategory } from "@/lib/projects/categories";
import { defaultMillerPath, expandMillerPath } from "@/lib/projects/miller-path";
import {
  filterTasksByPriority,
  readPriorityFilter,
  writePriorityFilter,
} from "@/lib/projects/miller-priority-filter";
import {
  collectSubtreeTasks,
  partitionByCompletion,
  type ProjectTree,
} from "@/lib/projects/phase-tree";
import { weightedProgressForTasks } from "@/lib/projects/progress-task-input";

import MillerColumn, { type ColumnItem, type DetailSelection } from "./MillerColumn";
import MillerPriorityFilter from "./MillerPriorityFilter";
import { millerColumnShellClass } from "./miller-columns";
import { useMillerStripLayout } from "./useMillerStripLayout";
import { executeComposerSubmit } from "@/lib/projects/execute-composer-submit";
import type { ParsedProjectLine } from "@/lib/parser/parse-project-task-input";
import { useTRPC } from "@/trpc/client";

import NewItemRow from "./NewItemRow";
import PhaseDetail from "./PhaseDetail";
import TaskDetail from "./TaskDetail";
import ConfirmDialog from "./ConfirmDialog";
import ProjectSyntaxChip from "./ProjectSyntaxChip";
import type { ProjectPhase, ProjectTask } from "./types";
import { useProjectMutations } from "./useProjectMutations";

import "./projects-motion.css";

type Tree = ProjectTree<ProjectPhase, ProjectTask>;
type Node = Tree["rootPhases"][number];

type Confirm = { kind: "phase-delete"; id: string } | { kind: "task-delete"; id: string } | null;

type Props = {
  tree: Tree;
  projectId: string;
  category: ProjectCategory;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  selectedPath: string[];
  onSelectPath: (path: string[]) => void;
  estimateSampleCount?: number;
  onOpenSetup?: () => void;
};

function orderItems(phases: Node[], tasks: ProjectTask[]): ColumnItem[] {
  const activePhases = phases.filter((n) => n.phase.completedAt === null);
  const completedPhases = phases.filter((n) => n.phase.completedAt !== null);
  const t = partitionByCompletion(tasks);
  return [
    ...activePhases.map((node): ColumnItem => ({ kind: "phase", node })),
    ...t.active.map((task): ColumnItem => ({ kind: "task", task })),
    ...completedPhases.map((node): ColumnItem => ({ kind: "phase", node })),
    ...t.completed.map((task): ColumnItem => ({ kind: "task", task })),
  ];
}

export default function MillerColumnsView({
  tree,
  projectId,
  category,
  phases,
  tasks,
  selectedPath,
  onSelectPath,
  estimateSampleCount = 0,
  onOpenSetup,
}: Props) {
  const trpc = useTRPC();
  const { data: pinnedTaskIds = [] } = useQuery(
    trpc.weekDayPriorities.listPinnedTaskIds.queryOptions()
  );
  const { data: timeRollups } = useQuery(trpc.projects.getTimeRollups.queryOptions({ projectId }));
  const dayPriorityTaskIds = useMemo(() => new Set(pinnedTaskIds), [pinnedTaskIds]);
  const m = useProjectMutations(projectId);

  const [detail, setDetail] = useState<DetailSelection>(null);
  const [focus, setFocus] = useState({ col: 0, index: 0 });
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [composerFocused, setComposerFocused] = useState(false);

  const [priorityLevels, setPriorityLevels] = useState<Set<number>>(new Set());
  useEffect(() => setPriorityLevels(readPriorityFilter()), []);
  const togglePriority = useCallback((level: number) => {
    setPriorityLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      writePriorityFilter(next);
      return next;
    });
  }, []);

  const { nodeById, taskById } = useMemo(() => {
    const nodes = new Map<string, Node>();
    const taskMap = new Map<string, ProjectTask>();
    const walk = (list: Node[]) => {
      for (const node of list) {
        nodes.set(node.phase.id, node);
        for (const task of node.tasks) taskMap.set(task.id, task);
        walk(node.children);
      }
    };
    walk(tree.rootPhases);
    for (const task of tree.looseTasks) taskMap.set(task.id, task);
    return { nodeById: nodes, taskById: taskMap };
  }, [tree]);

  const phaseMetrics = useMemo(() => {
    const metrics = new Map<string, { percent: number; timeSpentSeconds: number }>();
    const walk = (list: Node[]) => {
      for (const node of list) {
        const subtreeTasks = collectSubtreeTasks(node);
        const progress = weightedProgressForTasks(
          subtreeTasks.map((task) => ({
            id: task.id,
            completedAt: task.completedAt,
            isTop3: task.isTop3,
          })),
          dayPriorityTaskIds
        );
        metrics.set(node.phase.id, {
          percent: progress.percent,
          timeSpentSeconds: timeRollups?.byPhaseId[node.phase.id] ?? 0,
        });
        walk(node.children);
      }
    };
    walk(tree.rootPhases);
    return metrics;
  }, [tree.rootPhases, dayPriorityTaskIds, timeRollups?.byPhaseId]);

  const tasksForParent = useCallback(
    (parentPhaseId: string | null): ProjectTask[] =>
      parentPhaseId === null ? tree.looseTasks : (nodeById.get(parentPhaseId)?.tasks ?? []),
    [tree.looseTasks, nodeById]
  );

  const phasesForParent = useCallback(
    (parentPhaseId: string | null): Node[] =>
      parentPhaseId === null ? tree.rootPhases : (nodeById.get(parentPhaseId)?.children ?? []),
    [tree.rootPhases, nodeById]
  );

  const columns = useMemo(() => {
    const result: { level: number; parentPhaseId: string | null; items: ColumnItem[] }[] = [];
    result.push({
      level: 0,
      parentPhaseId: null,
      items: orderItems(tree.rootPhases, filterTasksByPriority(tree.looseTasks, priorityLevels)),
    });

    let currentPhases = tree.rootPhases;
    for (let i = 0; i < selectedPath.length; i += 1) {
      const node = currentPhases.find((n) => n.phase.id === selectedPath[i]);
      if (!node) break;
      result.push({
        level: i + 1,
        parentPhaseId: node.phase.id,
        items: orderItems(node.children, filterTasksByPriority(node.tasks, priorityLevels)),
      });
      currentPhases = node.children;
    }
    return result;
  }, [tree, selectedPath, priorityLevels]);

  const activeColumnLevel = selectedPath.length;

  const { stripRef, ghostColumnCount, widthClassName, targetVisibleColumns } = useMillerStripLayout(
    columns.length
  );

  useEffect(() => {
    const basePath =
      selectedPath.length > 0 ? selectedPath : defaultMillerPath(tree, targetVisibleColumns);
    const expanded = expandMillerPath(tree, basePath, targetVisibleColumns);
    if (expanded.join() !== selectedPath.join()) {
      onSelectPath(expanded);
    }
  }, [tree, selectedPath, targetVisibleColumns, onSelectPath]);

  useEffect(() => {
    setFocus((f) => {
      const col = Math.min(f.col, columns.length - 1);
      const len = columns[col]?.items.length ?? 0;
      const index = Math.min(f.index, Math.max(len - 1, 0));
      return col === f.col && index === f.index ? f : { col, index };
    });
  }, [columns]);

  const openPhase = useCallback(
    (level: number, node: Node) => {
      const userPath = selectedPath.slice(0, level).concat(node.phase.id);
      const expanded = expandMillerPath(tree, userPath, targetVisibleColumns);
      onSelectPath(expanded);
      setDetail({ type: "phase", id: node.phase.id });
      setFocus({ col: expanded.length, index: 0 });
    },
    [onSelectPath, selectedPath, tree, targetVisibleColumns]
  );

  const openTaskDetail = useCallback(
    (level: number, task: ProjectTask) => {
      onSelectPath(selectedPath.slice(0, level));
      setDetail({ type: "task", id: task.id });
    },
    [onSelectPath, selectedPath]
  );

  const toggleTask = useCallback(
    (task: ProjectTask) => {
      if (task.completedAt !== null) m.uncompleteTask.mutate({ id: task.id });
      else m.completeTask.mutate({ id: task.id });
    },
    [m.completeTask, m.uncompleteTask]
  );

  const moveTaskToParent = useCallback(
    (taskId: string, parentPhaseId: string | null) => {
      const siblings = tasksForParent(parentPhaseId).filter((t) => t.id !== taskId);
      const sortOrder = siblings.reduce((max, t) => Math.max(max, t.sortOrder + 1), 0);
      m.moveTask.mutate({ id: taskId, phaseId: parentPhaseId, sortOrder });
    },
    [tasksForParent, m.moveTask]
  );

  const reorderTask = useCallback(
    (taskId: string, targetId: string, parentPhaseId: string | null) => {
      if (taskId === targetId) return;
      const current = tasksForParent(parentPhaseId);
      const dragged = taskById.get(taskId);
      if (!dragged) return;

      const without = current.filter((t) => t.id !== taskId);
      const targetIndex = without.findIndex((t) => t.id === targetId);
      const insertAt = targetIndex === -1 ? without.length : targetIndex;
      const next = [...without.slice(0, insertAt), dragged, ...without.slice(insertAt)];

      const moves = next
        .map((t, index) => ({ task: t, index }))
        .filter(
          ({ task, index }) =>
            task.id === taskId || task.sortOrder !== index || task.phaseId !== parentPhaseId
        )
        .map(({ task, index }) =>
          m.moveTaskSilent.mutateAsync({ id: task.id, phaseId: parentPhaseId, sortOrder: index })
        );

      const invalidate = m.invalidate;
      void Promise.all(moves).then(invalidate);
    },
    [tasksForParent, taskById, m.moveTaskSilent, m.invalidate]
  );

  const reorderPhase = useCallback(
    (phaseId: string, targetPhaseId: string, parentPhaseId: string | null) => {
      if (phaseId === targetPhaseId) return;
      const dragged = nodeById.get(phaseId);
      if (!dragged) return;

      const isCompleted = dragged.phase.completedAt !== null;
      const partition = phasesForParent(parentPhaseId).filter(
        (n) => (n.phase.completedAt !== null) === isCompleted
      );
      if (!partition.some((n) => n.phase.id === targetPhaseId)) return;

      const without = partition.filter((n) => n.phase.id !== phaseId);
      const targetIndex = without.findIndex((n) => n.phase.id === targetPhaseId);
      const insertAt = targetIndex === -1 ? without.length : targetIndex;
      const next = [...without.slice(0, insertAt), dragged, ...without.slice(insertAt)];

      const baseOrder = Math.min(...partition.map((n) => n.phase.sortOrder));

      const moves = next
        .map((n, index) => ({ phase: n.phase, sortOrder: baseOrder + index }))
        .filter(({ phase, sortOrder }) => phase.sortOrder !== sortOrder)
        .map(({ phase, sortOrder }) =>
          m.updatePhaseSilent.mutateAsync({ id: phase.id, sortOrder })
        );

      void Promise.all(moves).then(m.invalidate);
    },
    [nodeById, phasesForParent, m.updatePhaseSilent, m.invalidate]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const active = event.active.data.current;
      const over = event.over?.data.current as
        | { kind: "phase"; phaseId: string; parentPhaseId: string | null }
        | { kind: "column"; parentPhaseId: string | null }
        | { kind: "task"; taskId: string; parentPhaseId: string | null }
        | undefined;
      if (!over) return;

      if (active?.kind === "phase-drag") {
        if (over.kind === "phase") {
          reorderPhase(
            active.phaseId as string,
            over.phaseId,
            active.parentPhaseId as string | null
          );
        }
        return;
      }

      const taskId = active?.taskId as string | undefined;
      if (!taskId) return;

      if (over.kind === "phase") moveTaskToParent(taskId, over.phaseId);
      else if (over.kind === "column") moveTaskToParent(taskId, over.parentPhaseId);
      else reorderTask(taskId, over.taskId, over.parentPhaseId);
    },
    [moveTaskToParent, reorderTask, reorderPhase]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const col = columns[focus.col];
      if (!col) return;
      const item = col.items[focus.index];

      if (e.key === "Escape" && detail) {
        e.preventDefault();
        setDetail(null);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocus((f) => ({
          col: f.col,
          index: Math.min(f.index + 1, (columns[f.col]?.items.length ?? 1) - 1),
        }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocus((f) => ({ col: f.col, index: Math.max(f.index - 1, 0) }));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (item?.kind === "phase") openPhase(focus.col, item.node);
        else if (focus.col + 1 < columns.length) setFocus({ col: focus.col + 1, index: 0 });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (focus.col > 0) setFocus({ col: focus.col - 1, index: 0 });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (item?.kind === "phase") openPhase(focus.col, item.node);
        else if (item?.kind === "task") openTaskDetail(focus.col, item.task);
      }
    },
    [columns, focus, openPhase, openTaskDetail, detail]
  );

  const confirmConfig = useMemo(() => {
    if (!confirm) return null;
    if (confirm.kind === "phase-delete") {
      return {
        title: "Delete this phase?",
        message:
          "This deletes the phase and its sub-phases. Tasks inside move back to the project.",
        confirmLabel: "Delete",
        destructive: true,
      };
    }
    return {
      title: "Delete this task?",
      message: "This permanently deletes the task.",
      confirmLabel: "Delete",
      destructive: true,
    };
  }, [confirm]);

  const runConfirm = useCallback(() => {
    if (!confirm) return;
    if (confirm.kind === "phase-delete") {
      const idx = selectedPath.indexOf(confirm.id);
      if (idx !== -1) onSelectPath(selectedPath.slice(0, idx));
      setDetail(null);
      m.deletePhase.mutate({ id: confirm.id });
    } else {
      setDetail(null);
      m.deleteTask.mutate({ id: confirm.id });
    }
    setConfirm(null);
  }, [confirm, m.deletePhase, m.deleteTask, selectedPath, onSelectPath]);

  const createPending =
    m.createTask.isPending || m.createPhase.isPending || m.bulkCreateTasks.isPending;
  const isBlank = columns.length === 1 && columns[0].items.length === 0;
  const composerParentPhaseId =
    selectedPath.length > 0 ? (selectedPath[selectedPath.length - 1] ?? null) : null;

  const renderDetail = useCallback(
    (item: ColumnItem) => {
      if (item.kind === "phase") {
        if (!(detail?.type === "phase" && detail.id === item.node.phase.id)) return null;
        return (
          <PhaseDetail
            node={item.node}
            category={category}
            dayPriorityTaskIds={dayPriorityTaskIds}
            timeSpentSeconds={timeRollups?.byPhaseId[item.node.phase.id] ?? 0}
            estimateSampleCount={estimateSampleCount}
            pending={m.deletePhase.isPending}
            onUpdate={(patch) => m.updatePhase.mutate({ id: item.node.phase.id, ...patch })}
            onRequestDelete={() => setConfirm({ kind: "phase-delete", id: item.node.phase.id })}
          />
        );
      }
      if (!(detail?.type === "task" && detail.id === item.task.id)) return null;
      return (
        <TaskDetail
          task={item.task}
          pending={m.deleteTask.isPending}
          saveError={m.updateTask.isError ? "Couldn't save your change — please try again." : null}
          onUpdate={(patch) => m.updateTask.mutate({ id: item.task.id, ...patch })}
          onToggleComplete={() => toggleTask(item.task)}
          onRequestDelete={() => setConfirm({ kind: "task-delete", id: item.task.id })}
        />
      );
    },
    [
      detail,
      m,
      toggleTask,
      category,
      dayPriorityTaskIds,
      timeRollups?.byPhaseId,
      estimateSampleCount,
    ]
  );

  const handleSubmitComposer = async (lines: ParsedProjectLine[]) => {
    await executeComposerSubmit({
      projectId,
      parentPhaseId: null,
      phases: phases.map((p) => ({
        id: p.id,
        name: p.name,
        parentPhaseId: p.parentPhaseId,
      })),
      lines,
      defaultPhaseId: composerParentPhaseId,
      mutations: {
        createPhase: (input) => m.createPhase.mutateAsync(input),
        createTask: (input) => m.createTask.mutateAsync(input),
        bulkCreateTasks: (input) => m.bulkCreateTasks.mutateAsync(input),
      },
    });
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div
            className="shrink-0 rounded-card border border-subtle bg-surface p-4"
            data-miller-composer
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <ProjectSyntaxChip showOnFocus focused={composerFocused} />
            </div>
            <NewItemRow
              projectId={projectId}
              phases={phases}
              tasks={tasks}
              defaultPhaseId={composerParentPhaseId}
              pending={createPending}
              onSubmitComposer={handleSubmitComposer}
              onFocusChange={setComposerFocused}
            />
          </div>

          {!isBlank ? (
            <div className="flex shrink-0 items-center justify-end px-1">
              <MillerPriorityFilter value={priorityLevels} onToggle={togglePriority} />
            </div>
          ) : null}

          <div
            ref={stripRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-label="Project columns"
            className="miller-column-scroll flex min-h-0 flex-1 items-stretch gap-1.5 overflow-x-auto pb-1 focus:outline-none focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]"
          >
            {columns.map((col) => (
              <MillerColumn
                key={col.level}
                level={col.level}
                parentPhaseId={col.parentPhaseId}
                category={category}
                items={col.items}
                openPhaseId={selectedPath[col.level] ?? null}
                detail={detail}
                focusIndex={focus.col === col.level ? focus.index : null}
                isActive={col.level === activeColumnLevel}
                shellClassName={millerColumnShellClass(widthClassName)}
                phaseMetrics={phaseMetrics}
                blankInvitation={
                  isBlank && col.level === 0 ? (
                    <ColoredEmptyInvitation
                      title="Add your first phase"
                      hint="Use the box above — one per line. Start a line with ;;; to add a phase."
                      className="mx-1 my-2 border-none bg-transparent px-3 py-6 shadow-none"
                      action={
                        onOpenSetup ? (
                          <Button type="button" variant="ghost" onClick={onOpenSetup}>
                            Set up project
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : null
                }
                renderDetail={renderDetail}
                onOpenPhase={(node) => openPhase(col.level, node)}
                onOpenTaskDetail={(task) => openTaskDetail(col.level, task)}
                onToggleTask={toggleTask}
              />
            ))}
            {isBlank
              ? Array.from({ length: ghostColumnCount }).map((_, i) => (
                  <div
                    key={`ghost:${i}`}
                    aria-hidden
                    className={`${millerColumnShellClass(widthClassName)} rounded-card border border-dashed border-subtle bg-surface-2 p-2 opacity-50`}
                  />
                ))
              : null}
          </div>
        </div>
      </DndContext>

      {confirmConfig ? (
        <ConfirmDialog
          open
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmLabel={confirmConfig.confirmLabel}
          destructive={confirmConfig.destructive}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </>
  );
}
