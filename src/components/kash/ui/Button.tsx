import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * The flat button set (DT-2 / §7). Three variants, all token-driven:
 * - `primary`     — graphite OUTLINE (1.5px ink border, no fill), the default.
 * - `ghost`       — borderless pill, muted ink, hairline border on hover.
 * - `destructive` — filled crimson (`--status-critical`) for irreversible
 *   confirms only (§9: crimson appears only on irreversible-danger paths).
 *
 * Font-size is intentionally NOT set here so a caller's `text-sm`/`text-xs`
 * wins on source order (see cn). Pass extra utilities via `className`.
 */
export type ButtonVariant = "primary" | "ghost" | "destructive";

const FOCUS_VISIBLE =
  "outline-none focus-visible:outline focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-[var(--focus-ring-offset)]";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn(
    "inline-flex items-center justify-center gap-2 rounded-control border-[1.5px] border-ink bg-transparent px-4 py-2 font-medium text-ink transition hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100",
    FOCUS_VISIBLE
  ),
  ghost: cn(
    "inline-flex items-center gap-2 rounded-pill border border-transparent bg-transparent px-3 py-1.5 text-ink-muted transition hover:border-border hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50",
    FOCUS_VISIBLE
  ),
  destructive: cn(
    "inline-flex items-center justify-center gap-2 rounded-control border-[1.5px] border-critical bg-critical px-4 py-2 font-medium text-accent-on transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100",
    FOCUS_VISIBLE
  ),
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className, ...rest },
  ref
) {
  return <button ref={ref} className={cn(VARIANTS[variant], className)} {...rest} />;
});

export default Button;
