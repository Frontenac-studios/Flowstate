"use client";

import Button from "@/components/kash/ui/Button";
import Dialog from "@/components/kash/ui/Dialog";

type Shortcut = {
  keys: string;
  description: string;
};

const SHORTCUTS: Shortcut[] = [
  { keys: "/", description: "Focus the task composer" },
  {
    keys: "Tab",
    description:
      "Accept composer suggestion when available; otherwise jump into the triage strip (when present)",
  },
  { keys: "⌃I", description: "Toggle the triage inbox" },
  { keys: "1 – 4", description: "Triage: Today, Tomorrow, Later, Drop" },
  { keys: "⌘1 – ⌘3", description: "Pin selected Today row to Top 3 slot" },
  { keys: "C / P / R / D", description: "Toggle Category / Project / Priority / Due lens (max 2)" },
  { keys: "⌘D", description: "Random weighted pick (RDM) → Focus mode" },
  {
    keys: "⌘Return",
    description: "Submit composer lines (in the composer) · mark the focus task done (in Focus)",
  },
  { keys: "Esc", description: "Exit Focus mode (or leave triage keyboard mode)" },
  { keys: "⌘K", description: "Open the command palette (search & navigate)" },
  { keys: "⌘/", description: "Toggle Claude chat side rail" },
  { keys: "⌘Z", description: "Undo complete, delete, or triage drop (this session)" },
  { keys: "?", description: "Open this shortcuts reference" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="On the plan canvas only."
      size="md"
      actions={
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <dl className="mt-2 max-h-[60vh] space-y-3 overflow-y-auto">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-start justify-between gap-4">
            <dt className="shrink-0 font-mono text-sm text-ink">{s.keys}</dt>
            <dd className="text-right text-sm text-ink-muted">{s.description}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
