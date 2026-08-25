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
    refetchOnWindowFocus: true,
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
