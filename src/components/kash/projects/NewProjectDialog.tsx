"use client";

import { useEffect, useRef } from "react";

import NewProjectForm from "@/components/kash/projects/NewProjectForm";
import Dialog from "@/components/kash/ui/Dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (result: { id: string }) => void;
};

export default function NewProjectDialog({ open, onClose, onCreated }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Dialog focuses its panel on open, which would steal the name field's autoFocus.
  // This effect runs after Dialog's (parent effects run after children), so the
  // name input ends up focused, ready to type.
  useEffect(() => {
    if (!open) return;
    bodyRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title="New project" size="md">
      <div ref={bodyRef} className="mt-2">
        <NewProjectForm onCreated={onCreated} onCancel={onClose} />
      </div>
    </Dialog>
  );
}
