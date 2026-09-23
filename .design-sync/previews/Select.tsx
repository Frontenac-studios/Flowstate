import Select from "../../src/components/kash/ui/Select";

/** Native chevron is kept deliberately — no custom appearance. */
export const Default = () => (
  <Select className="w-56" defaultValue="business">
    <option value="business">Business</option>
    <option value="personal">Personal</option>
  </Select>
);

export const WithLabel = () => (
  <label className="flex w-56 flex-col gap-[var(--space-2)]">
    <span className="text-meta text-ink-muted">Priority</span>
    <Select defaultValue="2">
      <option value="0">None</option>
      <option value="1">Low</option>
      <option value="2">Med</option>
      <option value="3">High</option>
    </Select>
  </label>
);

export const Disabled = () => (
  <Select className="w-56" defaultValue="business" disabled>
    <option value="business">Business</option>
  </Select>
);
