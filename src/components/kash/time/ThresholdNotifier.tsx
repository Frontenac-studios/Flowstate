"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { showNotification } from "@/lib/notify/notify";
import {
  EMPTY_NOTIFIED_STATE,
  selectThresholdAlerts,
  type NotifiedState,
  type ThresholdAlert,
} from "@/lib/notify/threshold-alerts";
import { DEFAULT_ALERT_PREFS, type AlertPrefs } from "@/lib/settings/constants";
import { useTRPC } from "@/trpc/client";

/** Which per-type switch governs each alert. */
const ALERT_PREF_KEY: Record<ThresholdAlert["type"], keyof AlertPrefs> = {
  client_threshold: "clientThreshold",
  project_over_estimate: "projectOverEstimate",
  weekly_hours: "weeklyHours",
};

const STORAGE_KEY = "kash:threshold-notified";

/**
 * How often the snapshot is re-read while Today is open and visible.
 *
 * These three alerts are hour-scale — a client crossing 20 billable hours, a
 * project running past its estimate, a weekly hours summary — so the freshness
 * requirement is minutes, not seconds. Anything sooner is pure load: the
 * procedure table-scans every time entry, task, phase and project for the user
 * on each call.
 */
const SNAPSHOT_POLL_MS = 5 * 60 * 1000;

function loadNotified(): NotifiedState {
  if (typeof window === "undefined") return EMPTY_NOTIFIED_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_NOTIFIED_STATE;
    const parsed = JSON.parse(raw) as Partial<NotifiedState>;
    return {
      clientsAtThreshold: parsed.clientsAtThreshold ?? [],
      projectsOverEstimate: parsed.projectsOverEstimate ?? [],
      weeklyNotifiedWeek: parsed.weeklyNotifiedWeek ?? null,
    };
  } catch {
    return EMPTY_NOTIFIED_STATE;
  }
}

function saveNotified(state: NotifiedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Fires the three data-driven W2d alerts (client-20h, project over estimate,
 * weekly hours) when their thresholds cross. Renders nothing; mounted on Today so
 * it runs whenever the app is open. Which alerts have fired is kept in
 * localStorage so each crossing notifies once (and re-arms when it clears) —
 * the server snapshot stays stateless. Gated on the master Notifications setting;
 * per-type switches are a follow-up.
 */
export default function ThresholdNotifier() {
  const trpc = useTRPC();
  const tzOffsetMinutes = -new Date().getTimezoneOffset();

  const { data: settings } = useQuery(trpc.settings.get.queryOptions());
  const notificationsEnabled = settings?.notificationsEnabled ?? true;
  const alertPrefs = settings?.alertPrefs ?? DEFAULT_ALERT_PREFS;

  const { data: snapshot } = useQuery({
    ...trpc.timeEntries.getThresholdAlerts.queryOptions({ tzOffsetMinutes }),
    // A deliberate, bounded cadence — this query used to be the single noisiest
    // route in production. Every path is capped:
    //   staleTime      — mount/focus/reconnect refetch at most once per period.
    //   refetchInterval + refetchIntervalInBackground:false
    //                  — one tick per period while the tab is visible, nothing
    //                    at all while it is hidden.
    //   retry/retryOnMount:false
    //                  — a failed snapshot has no cached data, so it counts as
    //                    permanently stale and would otherwise re-fire on every
    //                    mount and every focus. The next tick is the retry.
    // Timer start/stop invalidates this key (TodayTimer), so a crossing that
    // happens as you stop the clock still surfaces immediately.
    staleTime: SNAPSHOT_POLL_MS,
    refetchInterval: SNAPSHOT_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
    retryOnMount: false,
  });

  useEffect(() => {
    if (!snapshot || !notificationsEnabled) return;
    const { alerts, next } = selectThresholdAlerts(snapshot, loadNotified());
    if (alerts.length === 0) return;
    for (const alert of alerts) {
      // Suppress a type the user switched off; its dedup state still advances, so
      // re-enabling it notifies on the next crossing rather than replaying old ones.
      if (!alertPrefs[ALERT_PREF_KEY[alert.type]]) continue;
      void showNotification({ title: alert.title, body: alert.body, tag: alert.key });
    }
    saveNotified(next);
  }, [snapshot, notificationsEnabled, alertPrefs]);

  return null;
}
