import { CARE_COMING_SOON, type CareTab } from "./care-tabs";

/**
 * B&W landing for Care tabs whose features ship in later slices. A calm
 * empty-state panel — icon, title, a one-line preview of what's coming.
 */
export function CareComingSoon({ tab }: { tab: Exclude<CareTab, "garden"> }) {
  const { title, copy, icon } = CARE_COMING_SOON[tab];

  return (
    <div className="border-subtle flex flex-col items-center gap-3 rounded-card border bg-surface px-6 py-16 text-center">
      <span className="text-ink-faint" aria-hidden>
        {icon}
      </span>
      <p className="text-subtitle font-medium text-ink">{title}</p>
      <p className="max-w-xs text-meta leading-snug text-ink-muted">{copy}</p>
      <span className="rounded-chip border border-border-subtle px-2 py-0.5 text-caption text-ink-faint">
        Coming soon
      </span>
    </div>
  );
}
