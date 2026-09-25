import Checkbox from "../../src/components/kash/ui/Checkbox";

/** Native checkbox tinted via accentColor; defaults to --ink. */
export const States = () => (
  <div className="flex items-center gap-4">
    <Checkbox aria-label="Unchecked" />
    <Checkbox aria-label="Checked" defaultChecked />
    <Checkbox aria-label="Disabled" disabled />
    <Checkbox aria-label="Disabled checked" defaultChecked disabled />
  </div>
);

/** In a task row — the dominant use. */
export const InTaskRow = () => (
  <ul className="w-96 divide-y divide-[var(--border-subtle)] rounded-card border border-border bg-surface">
    {[
      { label: "Send the Great White fortnightly report", done: true },
      { label: "Reconcile September bills in Xero", done: false },
      { label: "Draft the Hume scope note", done: false },
    ].map((t) => (
      <li key={t.label} className="flex items-center gap-[var(--space-3)] px-4 py-2">
        <Checkbox aria-label={t.label} defaultChecked={t.done} />
        <span className={t.done ? "text-body text-ink-faint line-through" : "text-body text-ink"}>
          {t.label}
        </span>
      </li>
    ))}
  </ul>
);

/** Category tint — pass any CSS colour, including a token. */
export const Tinted = () => (
  <div className="flex items-center gap-4">
    <Checkbox aria-label="Business" defaultChecked accentColor="var(--cat-business-solid)" />
    <Checkbox aria-label="Personal" defaultChecked accentColor="var(--cat-personal-solid)" />
  </div>
);
