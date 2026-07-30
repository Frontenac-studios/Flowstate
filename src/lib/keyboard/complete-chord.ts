/**
 * The one completion chord shared across every task surface (D5): `Cmd+Shift+D`
 * on macOS, `Ctrl+Shift+D` elsewhere, toggles completion of the selected task.
 * Centralised so Plan, Week, and Miller all detect it identically — and so the
 * `Cmd+D` "decide next task" shortcut can exclude it with the same predicate.
 */
export function isCompleteSelectionChord(e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  if (!(e.metaKey || e.ctrlKey) || e.altKey || !e.shiftKey) return false;
  return e.key.toLowerCase() === "d";
}
