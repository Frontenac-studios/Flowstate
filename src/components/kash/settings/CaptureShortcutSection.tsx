"use client";

import { useCallback, useEffect, useState } from "react";

import Button from "@/components/kash/ui/Button";
import {
  readCaptureShortcutStatus,
  writeAutostart,
  writeCaptureShortcut,
  type CaptureShortcutStatus,
} from "@/lib/desktop/capture-bridge";
import { chordFromEvent, formatChord } from "@/lib/desktop/shortcut-chord";
import { FLAGS } from "@/lib/flags";
import { isDesktopRuntime } from "@/lib/runtime/is-desktop";

const RECORDER_HINT: Record<string, string> = {
  "modifier-only": "Keep holding, and add a letter.",
  "needs-modifier": "Add ⌘, ⌥ or ⌃ — a bare key would be caught everywhere.",
  "unsupported-key": "That key can't be part of a shortcut. Try a letter or a number.",
};

/**
 * Desktop-only controls for the global capture shortcut (W17).
 *
 * This is the one place the feature is allowed to speak. macOS hands a chord to
 * exactly one app, so registration fails whenever something else already owns
 * ⌘⇧K — and a hotkey that silently does nothing is worse than no hotkey. The
 * failure surfaces here with the rebind sitting next to it.
 */
export function CaptureShortcutSection() {
  const [status, setStatus] = useState<CaptureShortcutStatus | null>(null);
  const [desktop, setDesktop] = useState(false);
  const [recording, setRecording] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDesktop(isDesktopRuntime()), []);

  const refresh = useCallback(async () => {
    setStatus(await readCaptureShortcutStatus());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rebind = useCallback(
    async (chord: string) => {
      setSaving(true);
      try {
        await writeCaptureShortcut(chord);
        setHint(null);
      } catch (err) {
        setHint(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
        setRecording(false);
        await refresh();
      }
    },
    [refresh]
  );

  // While recording, every keystroke belongs to the recorder — including the
  // ones the browser would otherwise act on.
  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      if (event.key === "Escape") {
        setRecording(false);
        setHint(null);
        return;
      }
      const result = chordFromEvent(event);
      if (!result.ok) {
        setHint(RECORDER_HINT[result.reason] ?? null);
        return;
      }
      void rebind(result.chord);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, rebind]);

  const toggleAutostart = async (enabled: boolean) => {
    await writeAutostart(enabled);
    await refresh();
  };

  // Web build, or a desktop build older than this feature: nothing to configure.
  if (!FLAGS.capturePanel || !desktop || !status) return null;

  return (
    <section className="rounded-[var(--radius-row)] border border-border bg-surface p-4 shadow-surface">
      <h2 className="text-sm font-semibold text-ink">Quick capture</h2>
      <p className="mt-1 text-sm text-ink-muted">
        A shortcut that works from any app, so a thought reaches the Backlog without leaving what
        you&apos;re doing.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-control border border-subtle bg-surface-2 px-3 py-1.5 font-mono text-sm text-ink">
          {recording ? "Press the new shortcut…" : formatChord(status.shortcut)}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="text-sm"
          disabled={saving}
          onClick={() => {
            setHint(null);
            setRecording((on) => !on);
          }}
        >
          {recording ? "Cancel" : "Change"}
        </Button>
      </div>

      {hint ? <p className="mt-2 text-sm text-ink-muted">{hint}</p> : null}

      {status.error ? (
        <p className="mt-3 rounded-[var(--radius-chip)] border border-subtle bg-surface-2 p-3 text-sm text-critical">
          {status.error} Pick a different one and the shortcut starts working again.
        </p>
      ) : null}

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[var(--radius-chip)] border border-subtle bg-surface p-3">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={status.autostart}
          onChange={(e) => void toggleAutostart(e.target.checked)}
        />
        <span>
          <span className="text-sm font-medium text-ink">Launch Kash at login</span>
          <span className="mt-0.5 block text-sm text-ink-muted">
            The shortcut only answers while Kash is running, so leaving this off means capture works
            on the days you remember to open the app.
          </span>
        </span>
      </label>
    </section>
  );
}
