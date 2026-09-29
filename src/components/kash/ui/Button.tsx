import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * The button set (Spec v2). Every variant is a pill:
 * - `primary`          — filled ink, the default. (Reverses the old rule where an
 *   outline meant primary.)
 * - `secondary`        — soft gray fill (`--active-surface`).
 * - `tertiary`         — underlined text link, for skip / cancel.
 * - `ghost`            — borderless muted pill for icon+label chrome actions.
 * - `soft-destructive` — soft crimson; the everyday delete / remove.
 * - `destructive`      — solid crimson, reserved for the final irreversible
 *   confirm (§9: crimson fill appears only on irreversible-danger paths).
 *
 * Font-size is intentionally NOT set here so a caller's `text-sm`/`text-xs`
 * wins on source order (see cn). Pass extra utilities via `className`.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "soft-destructive"
  | "destructive";

const FOCUS_VISIBLE = "kash-focus-visible outline-none";
const DISABLED = "disabled:cursor-not-allowed disabled:opacity-50";
const PRESS = "active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";
const SOLID =
  "inline-flex items-center justify-center gap-2 rounded-pill px-4 py-2 font-semibold transition";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn(
    SOLID,
    "bg-accent text-accent-on hover:bg-accent-hover",
    // a KeyCap shortcut hint inside the ink pill inverts to a translucent chip
    "[&_kbd]:rounded-pill [&_kbd]:border-transparent [&_kbd]:bg-white/15 [&_kbd]:text-micro [&_kbd]:font-semibold [&_kbd]:text-accent-on",
    PRESS,
    DISABLED,
    FOCUS_VISIBLE
  ),
  secondary: cn(
    SOLID,
    "bg-active-surface text-ink hover:bg-[color-mix(in_srgb,var(--ink)_10%,var(--active-surface))]",
    PRESS,
    DISABLED,
    FOCUS_VISIBLE
  ),
  tertiary: cn(
    "inline-flex items-center gap-2 rounded-pill px-1.5 py-2 font-semibold text-ink underline decoration-[var(--check-border)] underline-offset-[3px] transition hover:decoration-ink",
    DISABLED,
    FOCUS_VISIBLE
  ),
  ghost: cn(
    "inline-flex items-center gap-2 rounded-pill border border-transparent bg-transparent px-3 py-1.5 text-ink-muted transition hover:border-border hover:bg-surface-2 hover:text-ink",
    DISABLED,
    FOCUS_VISIBLE
  ),
  "soft-destructive": cn(
    SOLID,
    "bg-critical-soft text-critical hover:bg-[color-mix(in_srgb,var(--status-critical)_16%,var(--surface))]",
    PRESS,
    DISABLED,
    FOCUS_VISIBLE
  ),
  destructive: cn(
    SOLID,
    "bg-critical text-accent-on hover:opacity-90",
    PRESS,
    DISABLED,
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
