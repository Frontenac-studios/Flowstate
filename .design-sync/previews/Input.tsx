import Input from "../../src/components/kash/ui/Input";
import { inlineValidationFieldClass } from "../../src/components/kash/ui/InlineValidation";

/** Not w-full by default — the caller owns width. */
export const Default = () => (
  <div className="flex flex-col gap-3">
    <Input className="w-80" defaultValue="Draft the Hume scope note" />
    <Input className="w-80" placeholder="Task title…" />
  </div>
);

export const WithLabel = () => (
  <label className="flex w-80 flex-col gap-[var(--space-2)]">
    <span className="text-meta text-ink-muted">Client</span>
    <Input defaultValue="Great White" />
  </label>
);

export const States = () => (
  <div className="flex flex-col gap-3">
    <Input className="w-80" defaultValue="Normal" />
    <Input className="w-80" defaultValue="Disabled" disabled />
    <Input className="w-80" defaultValue="Read only" readOnly />
    <Input className={`w-80 ${inlineValidationFieldClass}`} defaultValue="Invalid" aria-invalid />
  </div>
);

export const Types = () => (
  <div className="flex items-center gap-3">
    <Input className="w-40" type="date" defaultValue="2026-09-24" />
    <Input className="w-28" type="number" defaultValue={45} />
    <Input className="w-56" type="search" placeholder="Search tasks…" />
  </div>
);
