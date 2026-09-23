import { ShortcutHint } from "../../src/components/kash/ui/ShortcutHint";

/** Label first, cap second — the app-wide hint order. */
export const Default = () => (
  <div className="flex flex-col items-start gap-2">
    <ShortcutHint label="Capture" keys="⌘⇧K" />
    <ShortcutHint label="Command palette" keys="⌘K" />
    <ShortcutHint label="Search" keys="/" />
  </div>
);

/** In a footer rail — the dominant placement. */
export const InFooter = () => (
  <div className="flex w-[30rem] items-center justify-end gap-4 rounded-card border border-border bg-surface px-4 py-2 text-meta text-ink-muted">
    <ShortcutHint label="Accept" keys="Enter" />
    <ShortcutHint label="Dismiss" keys="Esc" />
  </div>
);
