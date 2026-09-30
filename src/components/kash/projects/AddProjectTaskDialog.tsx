"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import Button from "@/components/kash/ui/Button";
import Dialog from "@/components/kash/ui/Dialog";
import Input from "@/components/kash/ui/Input";
import Select from "@/components/kash/ui/Select";
import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import { resolveProjectBacklogCreateFields } from "@/lib/tasks/project-backlog-create";

import type { ProjectDetail, ProjectPhase } from "./types";
import { useProjectMutations } from "./useProjectMutations";

/** Indented "Design › Web" labels for every phase, in plan order. */
function phaseOptions(phases: ProjectPhase[]): { id: string; label: string }[] {
  const children = new Map<string | null, ProjectPhase[]>();
  for (const p of phases) {
    const key = p.parentPhaseId ?? null;
    children.set(key, [...(children.get(key) ?? []), p]);
  }
  const out: { id: string; label: string }[] = [];
  const walk = (parent: string | null, trail: string[]) => {
    for (const p of (children.get(parent) ?? []).sort((a, b) => a.sortOrder - b.sortOrder)) {
      const path = [...trail, p.name];
      out.push({ id: p.id, label: path.join(" › ") });
      walk(p.id, path);
    }
  };
  walk(null, []);
  return out;
}

/** The header's "Add task" (Spec v4): a title and, optionally, the phase it belongs to. */
export default function AddProjectTaskDialog({
  open,
  onClose,
  project,
  phases,
}: {
  open: boolean;
  onClose: () => void;
  project: ProjectDetail;
  phases: ProjectPhase[];
}) {
  const { createTask } = useProjectMutations(project.id);
  const toast = useOptionalToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [phaseId, setPhaseId] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
    }
  }, [open]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    createTask.mutate(
      {
        title: trimmed,
        projectId: project.id,
        phaseId: phaseId || null,
        category: project.category,
        // Lands in the project backlog, like the board's composer — not on Today.
        ...resolveProjectBacklogCreateFields({
          phaseStartDate: phases.find((p) => p.id === phaseId)?.startDate ?? null,
        }),
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => toast?.toast({ message: err.message, variant: "error" }),
      }
    );
  }

  const options = phaseOptions(phases);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add task"
      size="md"
      initialFocusRef={inputRef}
      actions={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-project-task"
            disabled={!title.trim() || createTask.isPending}
          >
            Add task
          </Button>
        </>
      }
    >
      <form id="add-project-task" onSubmit={submit} className="flex flex-col gap-3">
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          aria-label="Task title"
          className="w-full"
        />
        {options.length > 0 ? (
          <Select
            value={phaseId}
            onChange={(e) => setPhaseId(e.target.value)}
            aria-label="Phase"
            className="w-full"
          >
            <option value="">No phase</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        ) : null}
      </form>
    </Dialog>
  );
}
