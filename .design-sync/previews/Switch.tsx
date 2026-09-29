import { useState } from "react";

import Switch from "../../src/components/kash/ui/Switch";

function Controlled({ initial, label }: { initial: boolean; label: string }) {
  const [on, setOn] = useState(initial);
  return (
    <div className="flex w-80 items-center justify-between gap-4">
      <span className="text-body text-ink">{label}</span>
      <Switch checked={on} onCheckedChange={setOn} aria-label={label} />
    </div>
  );
}

/** Spec v3 Cc — 36×22 track, off gray, on ink. */
export const States = () => (
  <div className="flex flex-col gap-3">
    <Controlled initial label="Morning hand-off" />
    <Controlled initial={false} label="Weekly review reminder" />
    <div className="flex w-80 items-center justify-between gap-4">
      <span className="text-body text-ink-muted">Calendar AI (disabled)</span>
      <Switch checked disabled onCheckedChange={() => undefined} aria-label="Calendar AI" />
    </div>
  </div>
);
