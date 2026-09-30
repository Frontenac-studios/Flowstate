"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import Button from "@/components/kash/ui/Button";
import Checkbox from "@/components/kash/ui/Checkbox";
import IconButton from "@/components/kash/ui/IconButton";
import Select from "@/components/kash/ui/Select";
import Sheet from "@/components/kash/ui/Sheet";
import Textarea from "@/components/kash/ui/Textarea";
import { kashIconProps } from "@/components/kash/ui/icon";
import type { TaskSnapshot } from "@/hooks/useSessionUndo";
import { parseISODateString } from "@/lib/dates/local-day";
import { categoryLabel } from "@/lib/projects/categories";
import { projectSolidVar } from "@/lib/projects/project-hue";
import { dispatchCompleteTask } from "@/lib/tasks/complete-task-event";
import { PRIORITY_LEVELS, priorityMeta } from "@/lib/tasks/priority";
import { getTaskTitleError } from "@/lib/taskValidation";
import { useTRPC } from "@/trpc/client";

import TaskTagsByKind from "./TaskTagsByKind";

type Props = {
  /** The task to show, or null when the sheet is closed. */
  taskId: string | null;
  onClose: () => void;
  /** Called with the deleted task's snapshot so the surface can offer undo. */
  onDeleted?: (snapshot: TaskSnapshot) => void;
};

const DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const CREATED = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function formatClock(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/**
 * Spec v5 DetailA — the task detail sheet: right-docked, breadcrumb + round check +
 * title, then label/value property rows (Due, Scheduled, Priority, Phase, Estimate),
 * tags, a checklist and notes, with Delete / Complete in the footer. Every field
 * saves as you leave it; there is no Save button.
 */
export default function TaskDetailSheet({ taskId, onClose, onDeleted }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const open = taskId !== null;

  const detailQuery = useQuery({
    ...trpc.tasks.getDetail.queryOptions({ id: taskId ?? "" }),
    enabled: open,
  });
  const checklistQuery = useQuery({
    ...trpc.taskChecklist.listByTask.queryOptions({ taskId: taskId ?? "" }),
    enabled: open,
  });
  const projectId = detailQuery.data?.task.projectId ?? null;
  const phasesQuery = useQuery({
    ...trpc.phases.listByProject.queryOptions({ projectId: projectId ?? "" }),
    enabled: open && projectId !== null,
  });

  const invalidate = () => {
    if (!taskId) return;
    void queryClient.invalidateQueries({
      queryKey: trpc.tasks.getDetail.queryKey({ id: taskId }),
    });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listIncomplete.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTop3Slots.queryKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.tasks.listTriageCandidates.queryKey() });
    void queryClient.invalidateQueries(trpc.tasks.listByProject.pathFilter());
  };
  const invalidateChecklist = () => {
    if (!taskId) return;
    void queryClient.invalidateQueries({
      queryKey: trpc.taskChecklist.listByTask.queryKey({ taskId }),
    });
  };

  const update = useMutation(trpc.tasks.update.mutationOptions({ onSuccess: invalidate }));
  const remove = useMutation(
    trpc.tasks.delete.mutationOptions({
      onSuccess: ({ snapshot }) => {
        invalidate();
        onDeleted?.(snapshot);
        onClose();
      },
    })
  );
  const addItem = useMutation(
    trpc.taskChecklist.create.mutationOptions({ onSuccess: invalidateChecklist })
  );
  const setItemDone = useMutation(
    trpc.taskChecklist.setDone.mutationOptions({ onSuccess: invalidateChecklist })
  );
  const deleteItem = useMutation(
    trpc.taskChecklist.delete.mutationOptions({ onSuccess: invalidateChecklist })
  );

  const detail = detailQuery.data;
  const task = detail?.task;
  const patch = (fields: Omit<Parameters<typeof update.mutate>[0], "id">) => {
    if (taskId) update.mutate({ id: taskId, ...fields });
  };

  const colorSource = detail?.project
    ? { category: detail.project.category, hue: detail.project.hue }
    : task
      ? { category: task.category, hue: null }
      : null;

  const breadcrumb = task ? (
    <>
      {colorSource ? (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-pill"
          style={{ backgroundColor: projectSolidVar(colorSource) }}
        />
      ) : null}
      <span className="truncate">
        {detail?.project
          ? [detail.project.name, detail.phase?.name].filter(Boolean).join(" › ")
          : categoryLabel(task.category)}
      </span>
    </>
  ) : null;

  const items = checklistQuery.data ?? [];
  const doneCount = items.filter((i) => i.doneAt !== null).length;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={420}
      breadcrumb={breadcrumb}
      title={
        task ? (
          <TitleField
            key={task.id}
            title={task.title}
            completed={task.completedAt !== null}
            onComplete={() => {
              dispatchCompleteTask(task.id);
              onClose();
            }}
            onSave={(title) => patch({ title })}
          />
        ) : (
          "Task"
        )
      }
      footer={
        task ? (
          <>
            <span className="flex-1 text-meta text-ink-muted">
              Created {CREATED.format(task.createdAt)}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ id: task.id })}
            >
              Delete
            </Button>
            <Button
              type="button"
              disabled={task.completedAt !== null}
              onClick={() => {
                dispatchCompleteTask(task.id);
                onClose();
              }}
            >
              Complete
            </Button>
          </>
        ) : null
      }
    >
      {!task ? (
        <p className="py-6 text-body text-ink-muted">
          {detailQuery.isError ? "This task didn't load." : "Loading…"}
        </p>
      ) : (
        <div className="flex flex-col gap-6 pb-4 pt-2">
          <dl className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-y-1 text-[14px]">
            <PropertyRow label="Due">
              <DateField
                value={task.dueDate}
                ariaLabel="Due date"
                onChange={(dueDate) => patch({ dueDate })}
              />
            </PropertyRow>
            <PropertyRow label="Scheduled">
              <div className="flex items-center gap-1">
                <DateField
                  value={task.scheduledDate}
                  ariaLabel="Scheduled day"
                  onChange={(scheduledDate) => patch({ scheduledDate })}
                />
                {detail?.block ? (
                  <span className="text-ink-muted">
                    · {formatClock(detail.block.startMin)}–{formatClock(detail.block.endMin)}
                  </span>
                ) : null}
              </div>
            </PropertyRow>
            <PropertyRow label="Priority">
              <div className="flex flex-wrap gap-1" role="group" aria-label="Priority">
                {PRIORITY_LEVELS.map((level) => {
                  const selected = task.priority === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => patch({ priority: level })}
                      className={`kash-focus-visible h-7 rounded-pill px-2.5 text-meta outline-none transition-colors ${
                        selected
                          ? "bg-ink font-semibold text-accent-on"
                          : "text-ink-muted hover:bg-tint-hover hover:text-ink"
                      }`}
                    >
                      {priorityMeta(level).label}
                    </button>
                  );
                })}
              </div>
            </PropertyRow>
            {projectId ? (
              <PropertyRow label="Phase">
                <Select
                  aria-label="Phase"
                  value={task.phaseId ?? ""}
                  onChange={(e) => patch({ phaseId: e.target.value || null })}
                  className="!h-9 w-full !border-transparent !px-2 text-[14px] font-medium hover:bg-tint-hover"
                >
                  <option value="">No phase</option>
                  {(phasesQuery.data ?? []).map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.parentPhaseId ? `  ${phase.name}` : phase.name}
                    </option>
                  ))}
                </Select>
              </PropertyRow>
            ) : null}
            <PropertyRow label="Estimate">
              <EstimateField
                key={`${task.id}:${task.timeEstimateMinutes ?? ""}`}
                minutes={task.timeEstimateMinutes}
                onSave={(timeEstimateMinutes) => patch({ timeEstimateMinutes })}
              />
            </PropertyRow>
          </dl>

          <Section label="Tags">
            <TaskTagsByKind tags={task.tags ?? []} onChange={(tags) => patch({ tags })} />
          </Section>

          <Section
            label={items.length > 0 ? `Checklist · ${doneCount} of ${items.length}` : "Checklist"}
          >
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.id} className="group flex h-9 items-center gap-2.5 text-[14px]">
                  <Checkbox
                    checked={item.doneAt !== null}
                    aria-label={`${item.doneAt ? "Uncheck" : "Check"} ${item.text}`}
                    onChange={(e) => setItemDone.mutate({ id: item.id, done: e.target.checked })}
                  />
                  <span
                    className={`min-w-0 flex-1 truncate ${
                      item.doneAt ? "text-ink-faint line-through" : "text-ink"
                    }`}
                  >
                    {item.text}
                  </span>
                  <IconButton
                    aria-label={`Remove ${item.text}`}
                    onClick={() => deleteItem.mutate({ id: item.id })}
                    className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <X {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
                  </IconButton>
                </li>
              ))}
            </ul>
            <AddItemField
              onAdd={(text) => taskId && addItem.mutate({ taskId, text })}
              disabled={addItem.isPending}
            />
          </Section>

          <Section label="Notes">
            <NotesField
              key={task.id}
              notes={task.notes}
              onSave={(notes) => patch({ notes: notes || null })}
            />
          </Section>
        </div>
      )}
    </Sheet>
  );
}

function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="flex h-9 items-center text-ink-muted">{label}</dt>
      <dd className="flex min-h-9 min-w-0 items-center font-medium text-ink">{children}</dd>
    </>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-micro font-semibold uppercase tracking-caps text-ink-muted">{label}</h3>
      {children}
    </section>
  );
}

/** Editable 20/600 title with the round complete check before it. */
function TitleField({
  title,
  completed,
  onComplete,
  onSave,
}: {
  title: string;
  completed: boolean;
  onComplete: () => void;
  onSave: (title: string) => void;
}) {
  const [draft, setDraft] = useState(title);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex items-start gap-3">
      <Checkbox
        round
        className="mt-1 !size-[22px]"
        checked={completed}
        disabled={completed}
        aria-label={`Complete ${title}`}
        onChange={onComplete}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <input
          aria-label="Task title"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const next = draft.trim();
            const titleError = getTaskTitleError(next);
            if (titleError) {
              setError(titleError);
              setDraft(title);
              return;
            }
            setError(null);
            if (next !== title) onSave(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="w-full rounded-row bg-transparent text-title font-semibold leading-snug text-ink outline-none hover:bg-tint-hover focus:bg-tint-hover"
        />
        {error ? (
          <span className="text-meta font-medium text-critical" role="alert">
            {error}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** A date shown as "Tue, Sep 29"; "Add" when empty; the native picker to change it. */
function DateField({
  value,
  ariaLabel,
  onChange,
}: {
  value: string | null;
  ariaLabel: string;
  onChange: (value: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };
  return (
    <span className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={openPicker}
        className={`kash-focus-visible -ml-2 h-8 rounded-row px-2 outline-none hover:bg-tint-hover ${
          value ? "text-ink" : "font-normal text-ink-faint"
        }`}
      >
        {value ? DAY.format(parseISODateString(value)) : "Add"}
      </button>
      {value ? (
        <IconButton aria-label={`Clear ${ariaLabel.toLowerCase()}`} onClick={() => onChange(null)}>
          <X {...kashIconProps({ tokenSize: "sm" })} aria-hidden />
        </IconButton>
      ) : null}
      <input
        ref={inputRef}
        type="date"
        aria-label={ariaLabel}
        tabIndex={-1}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="pointer-events-none absolute left-0 top-full h-0 w-0 opacity-0"
      />
    </span>
  );
}

/** Minutes estimate: "45m" / "1h 30m"; "Add" when empty. */
function EstimateField({
  minutes,
  onSave,
}: {
  minutes: number | null;
  onSave: (minutes: number | null) => void;
}) {
  const [draft, setDraft] = useState(minutes ? String(minutes) : "");
  return (
    <label className="flex items-center gap-1.5">
      <input
        inputMode="numeric"
        aria-label="Estimate in minutes"
        placeholder="Add"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={() => {
          const parsed = draft ? Math.min(24 * 60, Math.max(1, Number(draft))) : null;
          if (parsed !== minutes) onSave(parsed);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="-ml-2 h-8 w-16 rounded-row bg-transparent px-2 font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-faint hover:bg-tint-hover focus:bg-tint-hover"
      />
      {draft ? <span className="font-normal text-ink-muted">min</span> : null}
    </label>
  );
}

function AddItemField({ onAdd, disabled }: { onAdd: (text: string) => void; disabled: boolean }) {
  const [text, setText] = useState("");
  return (
    <input
      aria-label="Add a checklist item"
      placeholder="Add an item"
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && text.trim()) {
          onAdd(text.trim());
          setText("");
        }
      }}
      className="h-9 rounded-row bg-transparent px-0 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:bg-tint-hover focus:px-2"
    />
  );
}

function NotesField({ notes, onSave }: { notes: string | null; onSave: (notes: string) => void }) {
  const [draft, setDraft] = useState(notes ?? "");
  useEffect(() => setDraft(notes ?? ""), [notes]);
  return (
    <Textarea
      aria-label="Notes"
      placeholder="Add notes"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() !== (notes ?? "")) onSave(draft.trim());
      }}
      className="min-h-20 w-full !text-[14px] leading-relaxed"
    />
  );
}
