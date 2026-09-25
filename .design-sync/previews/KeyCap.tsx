import { KeyCap } from "../../src/components/kash/ui/KeyCap";

/** D38 / V5 — a keyboard hint rendered as a visible cap. */
export const Single = () => (
  <div className="flex items-center gap-2">
    <KeyCap>N</KeyCap>
    <KeyCap>/</KeyCap>
    <KeyCap>Esc</KeyCap>
    <KeyCap>Enter</KeyCap>
  </div>
);

/** Chords are one cap, not three — the app writes them as a single string. */
export const Chords = () => (
  <div className="flex items-center gap-2">
    <KeyCap>⌘K</KeyCap>
    <KeyCap>⌘⇧K</KeyCap>
    <KeyCap>⌥↑</KeyCap>
  </div>
);

export const InSentence = () => (
  <p className="text-body text-ink-muted">
    Press <KeyCap>⌘K</KeyCap> for the command palette, or <KeyCap>N</KeyCap> to capture a task
    without leaving the page.
  </p>
);
