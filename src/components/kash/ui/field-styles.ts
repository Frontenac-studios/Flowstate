/**
 * Shared field chrome for Input / Select / Textarea (Spec v2): a hairline
 * `--control-border`, an ink border plus soft halo on focus, and a crimson border
 * when `aria-invalid`. The focus/error stroke is thickened to 1.5px with a 0.5px
 * inset shadow rather than a wider border, so focusing never shifts the text.
 * Uses :focus, not :focus-visible — a field you are typing in always shows it.
 */
export const FIELD_CHROME =
  "border border-control-border bg-surface text-body text-ink outline-none transition-[border-color,box-shadow] " +
  "focus:border-ink focus:shadow-[inset_0_0_0_0.5px_var(--ink),var(--focus-halo)] " +
  "aria-[invalid=true]:border-critical aria-[invalid=true]:shadow-[inset_0_0_0_0.5px_var(--status-critical)] " +
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-muted";

/** Single-line fields: 40px pill. */
export const FIELD_PILL = "h-control rounded-pill px-4";

/** Text you can see but not edit (Input / Textarea only — `<select>` always matches :read-only). */
export const FIELD_READ_ONLY = "read-only:bg-surface-2";
