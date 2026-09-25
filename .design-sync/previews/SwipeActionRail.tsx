import SwipeActionRail from "../../src/components/kash/SwipeActionRail";
import { Check, Pencil, Trash2 } from "lucide-react";

const noop = () => {};

const ACTIONS = [
  { key: "edit", label: "Edit", icon: Pencil, tone: "edit" as const, onClick: noop },
  { key: "done", label: "Complete", icon: Check, tone: "complete" as const, onClick: noop },
  { key: "delete", label: "Delete", icon: Trash2, tone: "danger" as const, onClick: noop },
];

/** Open: one continuous --surface-2 tail, split by hairlines. */
export const Open = () => (
  <div className="flex w-96 items-stretch overflow-hidden rounded-row border border-border bg-surface">
    <span className="flex-1 px-3 py-2 text-body text-ink">Send the Great White report</span>
    <SwipeActionRail actions={ACTIONS} open />
  </div>
);

/** Closed: width collapses to 0 and the caps are removed from the tab order. */
export const Closed = () => (
  <div className="flex w-96 items-stretch overflow-hidden rounded-row border border-border bg-surface">
    <span className="flex-1 px-3 py-2 text-body text-ink">Send the Great White report</span>
    <SwipeActionRail actions={ACTIONS} open={false} />
  </div>
);

/** Tones: edit amber, complete green, danger crimson, neutral graphite. */
export const Tones = () => (
  <div className="flex w-96 items-stretch overflow-hidden rounded-row border border-border bg-surface">
    <span className="flex-1 px-3 py-2 text-body text-ink">Tone ramp</span>
    <SwipeActionRail
      actions={[
        ...ACTIONS,
        { key: "park", label: "Park", icon: Pencil, tone: "neutral" as const, onClick: noop },
      ]}
      open
    />
  </div>
);

/** A disabled cap dims to 40% and loses the hover fill. */
export const WithDisabled = () => (
  <div className="flex w-96 items-stretch overflow-hidden rounded-row border border-border bg-surface">
    <span className="flex-1 px-3 py-2 text-body text-ink">Already invoiced</span>
    <SwipeActionRail actions={[ACTIONS[0], { ...ACTIONS[2], disabled: true }]} open />
  </div>
);
