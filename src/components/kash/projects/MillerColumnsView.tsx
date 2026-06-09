"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useState } from "react";

import { isEditableTarget } from "@/lib/keyboard/is-editable-target";
import { defaultMillerPath, expandMillerPath } from "@/lib/projects/miller-path";
import { partitionByCompletion, type ProjectTree } from "@/lib/projects/phase-tree";

import MillerColumn, { type ColumnItem, type DetailSelection } from "./MillerColumn";
import MillerGhostColumn from "./MillerGhostColumn";
import { millerColumnShellClass } from "./miller-columns";
import { useMillerStripLayout } from "./useMillerStripLayout";
import { executeComposerSubmit } from "@/lib/projects/execute-composer-submit";
import type { ParsedProjectLine } from "@/lib/parser/parse-project-task-input";

import NewItemRow from "./NewItemRow";
import PhaseDetail from "./PhaseDetail";
import TaskDetail from "./TaskDetail";
import ConfirmDialog from "./ConfirmDialog";
import type { ProjectPhase, ProjectTask } from "./types";
import { useProjectMutations } from "./useProjectMutations";

type Tree = ProjectTree<ProjectPhase, ProjectTask>;
type Node = Tree["rootPhases"][number];

type Confirm = { kind: "phase-delete"; id: string } | { kind: "task-delete"; id: string } | null;

type Props = {
  tree: Tree;
  projectId: string;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  selectedPath: string[];
  onSelectPath: (path: string[]) => void;
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

function isMillerDismissTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return (
    target.closest("[data-miller-item]") !== null ||
    target.closest("[data-miller-detail]") !== null ||
    target.closest("[data-miller-composer]") !== null
  );
}

export default function MillerColumnsView({
  tree,
  projectId,
  phases,
  tasks,
  selectedPath,
  onSelectPath,
}: Props) {
  const m = useProjectMutations(projectId);

  const [detail, setDetail] = useState<DetailSelection>(null);
  const [selection, setSelection] = useState<DetailSelection>(null);
  const [focus, setFocus] = useState({ col: 0, index: 0 });
  const [confirm, setConfirm] = useState<Confirm>(null);
  const { nodeById, taskById } = useMemo(() => {
    const nodes = new Map<string, Node>();
    const tasks = new Map<string, ProjectTask>();
    const walk = (list: Node[]) => {
      for (const node of list) {
        nodes.set(node.phase.id, node);
        for (const task of node.tasks) tasks.set(task.id, task);
        walk(node.children);
      }
    };
    walk(tree.rootPhases);
    for (const task of tree.looseTasks) tasks.set(task.id, task);
    return { nodeById: nodes, taskById: tasks };
  }, [tree]);

  const tasksForParent = useCallback(
    (parentPhaseId: string | null): ProjectTask[] =>
      parentPhaseId === null ? tree.looseTasks : (nodeById.get(parentPhaseId)?.tasks ?? []),
    [tree.looseTasks, nodeById]
  );

  const columns = useMemo(() => {
    const result: { level: number; parentPhaseId: string | null; items: ColumnItem[] }[] = [];
    result.push({
      level: 0,
      parentPhaseId: null,
      items: orderItems(tree.rootPhases, tree.looseTasks),
    });

    let currentPhases = tree.rootPhases;
    for (let i = 0; i < selectedPath.length; i += 1) {
      const node = currentPhases.find((n) => n.phase.id === selectedPath[i]);
      if (!node) break;
      result.push({
        level: i + 1,
        parentPhaseId: node.phase.id,
        items: orderItems(node.children, node.tasks),
      });
      currentPhases = node.children;
    }
    return result;
  }, [tree, selectedPath]);

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

  // Keep keyboard focus inside the rendered columns when the tree/path changes.
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
      setSelection(null);
      setFocus({ col: expanded.length, index: 0 });
    },
    [onSelectPath, selectedPath, tree, targetVisibleColumns]
  );

  const openPhaseDetail = useCallback(
    (level: number, node: Node) => {
      const userPath = selectedPath.slice(0, level).concat(node.phase.id);
      const expanded = expandMillerPath(tree, userPath, targetVisibleColumns);
      if (expanded.join() !== selectedPath.join()) {
        onSelectPath(expanded);
      }
      setDetail({ type: "phase", id: node.phase.id });
      setSelection(null);
      setFocus({ col: expanded.length, index: 0 });
    },
    [onSelectPath, selectedPath, tree, targetVisibleColumns]
  );

  const highlightTask = useCallback(
    (level: number, task: ProjectTask) => {
      onSelectPath(selectedPath.slice(0, level));
      setSelection({ type: "task", id: task.id });
    },
    [onSelectPath, selectedPath]
  );

  const openTaskDetail = useCallback(
    (level: number, task: ProjectTask) => {
      onSelectPath(selectedPath.slice(0, level));
      setSelection({ type: "task", id: task.id });
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const taskId = event.active.data.current?.taskId as string | undefined;
      const over = event.over?.data.current as
        | { kind: "phase"; phaseId: string }
        | { kind: "column"; parentPhaseId: string | null }
        | { kind: "task"; taskId: string; parentPhaseId: string | null }
        | undefined;
      if (!taskId || !over) return;

      if (over.kind === "phase") moveTaskToParent(taskId, over.phaseId);
      else if (over.kind === "column") moveTaskToParent(taskId, over.parentPhaseId);
      else reorderTask(taskId, over.taskId, over.parentPhaseId);
    },
    [moveTaskToParent, reorderTask]
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

  const handleWorkspacePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!detail) return;
      if (isMillerDismissTarget(e.target)) return;
      setDetail(null);
    },
    [detail]
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
      setSelection(null);
      m.deleteTask.mutate({ id: confirm.id });
    }
    setConfirm(null);
  }, [confirm, m.deletePhase, m.deleteTask, selectedPath, onSelectPath]);

  const createPending =
    m.createTask.isPending || m.createPhase.isPending || m.bulkCreateTasks.isPending;
  const isBlank = columns.length === 1 && columns[0].items.length === 0;
  const composerParentPhaseId =
    selectedPath.length > 0 ? (selectedPath[selectedPath.length - 1] ?? null) : null;
  const detailNode = detail?.type === "phase" ? (nodeById.get(detail.id) ?? null) : null;
  const detailTask = detail?.type === "task" ? (taskById.get(detail.id) ?? null) : null;

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
        <div
          className="flex min-h-0 flex-1 flex-col gap-3"
          onPointerDown={handleWorkspacePointerDown}
        >
          <div className="glass-panel-opaque shrink-0 p-4" data-miller-composer>
            {isBlank ? (
              <p className="mb-3 text-sm text-kash-ink-muted">
                Add tasks below — Parent//+ Child for subdirectories, or ;;; + Phase to create
                directories only.
              </p>
            ) : null}
            <NewItemRow
              projectId={projectId}
              phases={phases}
              tasks={tasks}
              defaultPhaseId={composerParentPhaseId}
              pending={createPending}
              onSubmitComposer={handleSubmitComposer}
            />
          </div>

          <div className="flex min-h-0 flex-1 gap-3">
            <div
              ref={stripRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              aria-label="Project columns"
              className="glass-panel-opaque flex min-h-0 flex-1 items-stretch gap-2 overflow-x-auto p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-kash-accent"
            >
              {columns.map((col) => (
                <MillerColumn
                  key={col.level}
                  level={col.level}
                  parentPhaseId={col.parentPhaseId}
                  items={col.items}
                  openPhaseId={selectedPath[col.level] ?? null}
                  detail={detail}
                  selection={selection}
                  focusIndex={focus.col === col.level ? focus.index : null}
                  isActive={col.level === activeColumnLevel}
                  shellClassName={millerColumnShellClass(widthClassName)}
                  onOpenPhase={(node) => openPhase(col.level, node)}
                  onOpenPhaseDetail={(node) => openPhaseDetail(col.level, node)}
                  onHighlightTask={(task) => highlightTask(col.level, task)}
                  onOpenTaskDetail={(task) => openTaskDetail(col.level, task)}
                  onToggleTask={toggleTask}
                />
              ))}
              {Array.from({ length: ghostColumnCount }, (_, i) => (
                <MillerGhostColumn
                  key={`ghost-${i}`}
                  shellClassName={millerColumnShellClass(widthClassName)}
                />
              ))}
            </div>

            {detail ? (
              <aside
                data-miller-detail
                className="glass-panel-opaque min-h-60 w-72 shrink-0 self-stretch overflow-y-auto p-4"
                aria-label={detail.type === "phase" ? "Phase details" : "Task details"}
              >
                {detailNode ? (
                  <PhaseDetail
                    node={detailNode}
                    pending={m.deletePhase.isPending}
                    onUpdate={(patch) =>
                      m.updatePhase.mutate({ id: detailNode.phase.id, ...patch })
                    }
                    onRequestDelete={() =>
                      setConfirm({ kind: "phase-delete", id: detailNode.phase.id })
                    }
                  />
                ) : detailTask ? (
                  <TaskDetail
                    task={detailTask}
                    pending={m.deleteTask.isPending}
                    onUpdate={(patch) => m.updateTask.mutate({ id: detailTask.id, ...patch })}
                    onToggleComplete={() => toggleTask(detailTask)}
                    onRequestDelete={() => setConfirm({ kind: "task-delete", id: detailTask.id })}
                  />
                ) : null}
              </aside>
            ) : null}
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
