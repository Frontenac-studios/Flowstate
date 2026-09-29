"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type RefObject } from "react";

import Input from "@/components/kash/ui/Input";
import Menu, { MenuDivider, MenuItem } from "@/components/kash/ui/Menu";
import { MENU_ROW } from "@/components/kash/ui/overlay-styles";
import { useDismiss } from "@/hooks/useDismiss";
import { useTRPC } from "@/trpc/client";

import ConfirmDialog from "./ConfirmDialog";

type Props = {
  project: { id: string; name: string };
  showTemplateFeatures?: boolean;
  /** The ⋯ trigger, so a click on it toggles the menu instead of dismiss-then-reopen. */
  triggerRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
};

export default function ProjectMenu({
  project,
  showTemplateFeatures = true,
  triggerRef,
  onClose,
}: Props) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
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

  const archiveProject = useMutation(
    trpc.projects.archive.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        setArchiveDialogOpen(false);
        onClose();
        router.push("/projects");
      },
    })
  );

  // Paused while a confirm dialog is up: the dialog portals outside the menu, so a
  // click inside it would otherwise read as "outside" and unmount the dialog with it.
  const fallbackTriggerRef = useRef<HTMLElement>(null);
  useDismiss(
    !saveDialogOpen && !archiveDialogOpen,
    [ref, triggerRef ?? fallbackTriggerRef],
    onClose
  );

  const trimmedName = templateName.trim();
  const canSave = trimmedName.length > 0 && !saveTemplate.isPending;

  return (
    <>
      <Menu
        ref={ref}
        aria-label={`Actions for ${project.name}`}
        className="absolute right-0 top-full mt-1 w-52"
      >
        <Link
          href={`/projects/${project.id}/imports`}
          role="menuitem"
          onClick={onClose}
          className={MENU_ROW}
        >
          Import history
        </Link>
        {showTemplateFeatures ? (
          <MenuItem
            onClick={() => {
              setTemplateName(project.name);
              setSaveDialogOpen(true);
            }}
            disabled={saveTemplate.isPending}
          >
            Save as template
          </MenuItem>
        ) : null}
        <MenuDivider />
        <MenuItem
          destructive
          onClick={() => setArchiveDialogOpen(true)}
          disabled={archiveProject.isPending}
        >
          Archive project
        </MenuItem>
      </Menu>

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

      <ConfirmDialog
        open={archiveDialogOpen}
        title="Archive project"
        message={`Archive "${project.name}"? It leaves your projects list but keeps all its phases and tasks — you can restore it later.`}
        confirmLabel={archiveProject.isPending ? "Archiving…" : "Archive project"}
        cancelLabel="Keep"
        destructive
        confirmDisabled={archiveProject.isPending}
        onCancel={() => {
          if (archiveProject.isPending) return;
          setArchiveDialogOpen(false);
        }}
        onConfirm={() => {
          if (archiveProject.isPending) return;
          archiveProject.mutate({ id: project.id });
        }}
      >
        {archiveProject.isError ? (
          <p role="alert" className="mt-4 text-sm text-critical">
            Couldn&apos;t archive the project. Please try again.
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
