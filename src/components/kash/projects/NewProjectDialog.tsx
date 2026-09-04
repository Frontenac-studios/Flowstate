"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import NewProjectForm from "@/components/kash/projects/NewProjectForm";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (result: { id: string }) => void;
};

export default function NewProjectDialog({ open, onClose, onCreated }: Props) {
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
      className="fixed inset-0 z-modal flex items-start justify-center px-4 pt-[18vh]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0" style={{ background: "var(--backdrop)" }} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-dialog-title"
        className="relative z-base w-full max-w-md rounded-card border border-border bg-surface p-5 shadow-overlay"
      >
        <h2 id="new-project-dialog-title" className="text-subtitle font-medium text-ink">
          New project
        </h2>
        <div className="mt-3">
          <NewProjectForm onCreated={onCreated} onCancel={onClose} />
        </div>
      </div>
    </div>,
    document.body
  );
}
