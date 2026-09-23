import Button from "../../src/components/kash/ui/Button";

/** The default: graphite 1.5px outline, no fill (DT-2). */
export const Primary = () => (
  <div className="flex items-center gap-3">
    <Button>Start the day</Button>
    <Button>Send invoice</Button>
  </div>
);

/** Borderless pill, muted ink — the workhorse for secondary row actions. */
export const Ghost = () => (
  <div className="flex items-center gap-3">
    <Button variant="ghost">Skip</Button>
    <Button variant="ghost">Move to next week</Button>
  </div>
);

/** Filled crimson. Irreversible confirms only (§9). */
export const Destructive = () => <Button variant="destructive">Delete project</Button>;

export const Disabled = () => (
  <div className="flex items-center gap-3">
    <Button disabled>Start the day</Button>
    <Button variant="ghost" disabled>
      Skip
    </Button>
    <Button variant="destructive" disabled>
      Delete project
    </Button>
  </div>
);

/** Font-size is deliberately not set by Button — a caller's text-* wins. */
export const SizedByCaller = () => (
  <div className="flex items-center gap-3">
    <Button className="text-xs">Small (text-xs)</Button>
    <Button>Default (inherits)</Button>
    <Button className="text-lg">Large (text-lg)</Button>
  </div>
);
