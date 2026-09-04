/**
 * Turning a keypress into a shortcut string the shell can register, and back
 * into something a person can read (W17).
 *
 * Two vocabularies meet here. macOS gives the browser a `KeyboardEvent`; Tauri's
 * global-shortcut parser wants `"CmdOrCtrl+Shift+K"`. Neither is what a person
 * should have to look at in Settings, which is why `formatChord` exists.
 */

/** Keys that can carry a shortcut on their own, beyond letters and digits. */
const NAMED_KEYS: Record<string, string> = {
  " ": "Space",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Backspace",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

const MODIFIER_KEYS = new Set(["Meta", "Control", "Alt", "Shift"]);

export type ChordResult =
  | { ok: true; chord: string }
  | { ok: false; reason: "modifier-only" | "needs-modifier" | "unsupported-key" };

/**
 * Build a Tauri chord from a keypress. Rejects the two shapes that look like a
 * binding but can't be one: modifiers alone, and a bare key that would swallow
 * that character everywhere on the machine.
 */
export function chordFromEvent(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): ChordResult {
  if (MODIFIER_KEYS.has(event.key)) return { ok: false, reason: "modifier-only" };

  const modifiers: string[] = [];
  if (event.metaKey) modifiers.push("CmdOrCtrl");
  if (event.ctrlKey && !event.metaKey) modifiers.push("Control");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");

  if (modifiers.length === 0) return { ok: false, reason: "needs-modifier" };

  const named = NAMED_KEYS[event.key];
  const isAlphanumeric = /^[a-z0-9]$/i.test(event.key);
  if (!named && !isAlphanumeric) return { ok: false, reason: "unsupported-key" };

  const key = named ?? event.key.toUpperCase();
  return { ok: true, chord: [...modifiers, key].join("+") };
}

const SYMBOLS: Record<string, string> = {
  CmdOrCtrl: "⌘",
  CommandOrControl: "⌘",
  Command: "⌘",
  Super: "⌘",
  Control: "⌃",
  Ctrl: "⌃",
  Alt: "⌥",
  Option: "⌥",
  Shift: "⇧",
};

/** "CmdOrCtrl+Shift+K" → "⌘⇧K", the way the key caps read. */
export function formatChord(chord: string): string {
  return chord
    .split("+")
    .map((part) => SYMBOLS[part] ?? part)
    .join("");
}
