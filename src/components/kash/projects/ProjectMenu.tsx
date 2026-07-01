"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import Input from "@/components/kash/ui/Input";
import { useTRPC } from "@/trpc/client";

import ConfirmDialog from "./ConfirmDialog";

type Props = {
  project: { id: string; name: string };
  onClose: () => void;
};

const MENU_BTN_FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

export default function ProjectMenu({ project, onClose }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState(project.name);

  const saveTemplate = useMutation(
    trpc.projects.saveAsTemplate.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.projects.listTemplates.queryKey() });
        setSaveDialogOpen(false);
        onClose();
      },
    })
  );

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const trimmedName = templateName.trim();
  const canSave = trimmedName.length > 0 && !saveTemplate.isPending;

  return (
    <>
      <div
        ref={ref}
        role="menu"
        aria-label={`Actions for ${project.name}`}
        className="absolute right-0 top-full z-overlay mt-1 w-52 rounded-card border border-border bg-surface p-1.5 shadow-overlay"
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setTemplateName(project.name);
            setSaveDialogOpen(true);
          }}
          disabled={saveTemplate.isPending}
          className={`flex w-full items-center rounded-control px-2 py-1.5 text-left text-body text-ink transition-colors hover:bg-surface-2 disabled:opacity-50 ${MENU_BTN_FOCUS}`}
        >
          Save as template
        </button>
      </div>

      <ConfirmDialog
        open={saveDialogOpen}
        title="Save as template"
        message="Reuse this project's phases and tasks when starting something new."
        confirmLabel={saveTemplate.isPending ? "Saving…" : "Save template"}
        confirmDisabled={!canSave || saveTemplate.isPending}
        onCancel={() => {
          if (saveTemplate.isPending) return;
          setSaveDialogOpen(false);
        }}
        onConfirm={() => {
          if (!canSave) return;
          saveTemplate.mutate({
            projectId: project.id,
            name: trimmedName,
          });
        }}
      >
        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="template-name" className="text-sm font-medium text-ink">
            Template name
          </label>
          <Input
            id="template-name"
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            maxLength={120}
            autoFocus
          />
          {saveTemplate.isError ? (
            <p role="alert" className="text-sm text-critical">
              Couldn&apos;t save the template. Please try again.
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
