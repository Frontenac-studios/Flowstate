"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import NewProjectForm from "@/components/kash/projects/NewProjectForm";

type Props = {
  open: boolean;
  showTemplateFeatures: boolean;
  onClose: () => void;
  onCreated: (result: { id: string; fromTemplate: boolean }) => void;
};

export default function NewProjectDialog({
  open,
  showTemplateFeatures,
  onClose,
  onCreated,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/20" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-dialog-title"
        className="relative z-base w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-overlay"
      >
        <h2 id="new-project-dialog-title" className="text-title font-semibold text-ink">
          New project
        </h2>
        <div className="mt-4">
          <NewProjectForm
            showTemplateFeatures={showTemplateFeatures}
            onCreated={onCreated}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
