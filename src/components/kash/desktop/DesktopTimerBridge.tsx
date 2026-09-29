"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Button from "@/components/kash/ui/Button";
import Dialog from "@/components/kash/ui/Dialog";
import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import { isDesktopRuntime } from "@/lib/runtime/is-desktop";
import {
  pushTimerTray,
  subscribeIdleReturn,
  subscribeTrayCommands,
  type TrayProject,
} from "@/lib/desktop/os-timer";
import { formatDuration } from "@/lib/time/duration";
import { IDLE_THRESHOLD_SECONDS } from "@/lib/time/idle-trim";
import { useTRPC } from "@/trpc/client";

/** How many switch/start targets the menu-bar timer offers. */
const TRAY_PROJECT_LIMIT = 6;

/** "34 minutes", "1h 05m" — the away window, read as prose for the prompt. */
function awayPhrase(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return formatDuration(seconds);
}

/**
 * Desktop-only glue for the menu-bar timer (W2f). Renders no chrome except the
 * idle keep/trim prompt. It mirrors the running timer down to the native tray,
 * runs the Stop/Switch commands the tray sends back, and — when the machine was
 * idle past the threshold — asks whether to keep or trim the away time. Mounted
 * once in the app shell; a no-op on the web build (nothing subscribes, nothing
 * pushes), so the hooks run unconditionally but stay dormant off the desktop.
 */
export default function DesktopTimerBridge() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toast = useOptionalToast();
  const desktop = isDesktopRuntime();

  const { data: running } = useQuery(trpc.timeEntries.getRunning.queryOptions());
  const { data: projects = [] } = useQuery(trpc.projects.list.queryOptions());

  const invalidateRunning = useCallback(() => {
    void queryClient.invalidateQueries(trpc.timeEntries.getRunning.pathFilter());
  }, [queryClient, trpc]);

  const startMutation = useMutation(
    trpc.timeEntries.start.mutationOptions({ onSuccess: invalidateRunning })
  );
  const stopMutation = useMutation(
    trpc.timeEntries.stop.mutationOptions({ onSuccess: invalidateRunning })
  );
  const resolveIdleMutation = useMutation(
    trpc.timeEntries.resolveIdle.mutationOptions({ onSuccess: invalidateRunning })
  );

  // Latest running entry, readable from the (once-registered) event handlers.
  const runningRef = useRef(running);
  runningRef.current = running;

  const recentProjects: TrayProject[] = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, TRAY_PROJECT_LIMIT)
        .map((p) => ({ id: p.id, name: p.name })),
    [projects]
  );

  // Mirror the timer + switch targets to the native menu-bar timer on change.
  const trayKey = JSON.stringify({
    running: running
      ? { name: running.projectName, at: new Date(running.startedAt).getTime() }
      : null,
    projects: recentProjects,
  });
  useEffect(() => {
    if (!desktop) return;
    void pushTimerTray(
      running
        ? {
            projectName: running.projectName,
            startedAtMs: new Date(running.startedAt).getTime(),
          }
        : null,
      recentProjects
    );
    // trayKey captures the payload; running/recentProjects are its source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop, trayKey]);

  // Run Stop / Switch requests coming back from the tray.
  useEffect(() => {
    if (!desktop) return;
    return subscribeTrayCommands((command) => {
      if (command.action === "stop") {
        if (runningRef.current) stopMutation.mutate(undefined);
      } else if (command.action === "start") {
        startMutation.mutate({ projectId: command.projectId });
      }
    });
  }, [desktop, startMutation, stopMutation]);

  // Idle keep/trim prompt. Only meaningful while a timer is actually running.
  const [idlePrompt, setIdlePrompt] = useState<{ awaySeconds: number } | null>(null);
  const trimRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!desktop) return;
    return subscribeIdleReturn(({ awaySeconds }) => {
      if (!runningRef.current) return;
      if (awaySeconds < IDLE_THRESHOLD_SECONDS) return;
      // A later idle supersedes an unanswered prompt rather than stacking.
      setIdlePrompt({ awaySeconds });
    });
  }, [desktop]);

  const resolveIdle = useCallback(
    (action: "keep" | "trim") => {
      const prompt = idlePrompt;
      if (!prompt) return;
      setIdlePrompt(null);
      resolveIdleMutation.mutate(
        { awaySeconds: prompt.awaySeconds, action },
        {
          onSuccess: () => {
            if (action === "trim") {
              toast?.toast({ message: `Trimmed ${awayPhrase(prompt.awaySeconds)} of idle time.` });
            }
          },
        }
      );
    },
    [idlePrompt, resolveIdleMutation, toast]
  );

  const keepIdle = useCallback(() => resolveIdle("keep"), [resolveIdle]);

  return (
    <Dialog
      open={idlePrompt !== null}
      // Escape is the safe keep; the scrim does nothing (the choice must be explicit).
      onClose={keepIdle}
      dismissOnScrim={false}
      title="You were away"
      description={
        idlePrompt
          ? `You were away ${awayPhrase(idlePrompt.awaySeconds)} — keep that time on the timer, or trim it off?`
          : null
      }
      // Trim is the preselected default, so Enter confirms it.
      initialFocusRef={trimRef}
      actions={
        <>
          <Button type="button" variant="outline" onClick={keepIdle}>
            Keep
          </Button>
          <Button ref={trimRef} type="button" variant="primary" onClick={() => resolveIdle("trim")}>
            Trim
          </Button>
        </>
      }
    />
  );
}
