import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * The button set (Spec v2 shapes, Spec v3 states). Every variant is a pill:
 * - `primary`          — filled ink, the default. Hover #2a2d34, pressed #000.
 * - `secondary`        — soft gray fill; hover adds a border in the context tint.
 * - `outline`          — white with a hairline border; the quiet action in dialogs
 *   and sheets (Cancel, Delete-in-a-sheet).
 * - `tertiary`         — underlined text link, for skip / cancel.
 * - `ghost`            — borderless muted pill for icon+label chrome actions.
 * - `soft-destructive` — soft crimson; the everyday delete / remove.
 * - `destructive`      — solid crimson, reserved for the final irreversible
 *   confirm (§9: crimson fill appears only on irreversible-danger paths).
 *
 * States (Spec v3 Ib): hover and pressed are fills, never a scale change; disabled is
 * 40% opacity; keyboard focus is the tint underline from `kash-focus-visible`. Inside
 * a `.kash-tint-scope` the tint is the project's colour, elsewhere gray.
 *
 * Font-size is intentionally NOT set here so a caller's `text-sm`/`text-xs`
 * wins on source order (see cn). Pass extra utilities via `className`.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "tertiary"
  | "ghost"
  | "soft-destructive"
  | "destructive";

const FOCUS_VISIBLE = "kash-focus-visible outline-none";
const DISABLED = "disabled:cursor-not-allowed disabled:opacity-40";
const SOLID =
  "inline-flex items-center justify-center gap-2 rounded-pill border px-4 py-2 font-semibold transition-colors motion-reduce:transition-none";
// Border colour is per variant, never in SOLID: cn() doesn't merge, so a shared
// `border-transparent` would beat the outline variant's border on CSS order.

const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn(
    SOLID,
    "border-transparent bg-accent text-accent-on hover:bg-primary-hover active:bg-primary-pressed",
    // a KeyCap shortcut hint inside the ink pill inverts to a translucent chip
    "[&_kbd]:rounded-pill [&_kbd]:border-transparent [&_kbd]:bg-white/15 [&_kbd]:text-micro [&_kbd]:font-semibold [&_kbd]:text-accent-on",
    DISABLED,
    FOCUS_VISIBLE
  ),
  secondary: cn(
    SOLID,
    "border-transparent bg-active-surface text-ink hover:border-tint-border active:bg-tint-pressed aria-expanded:bg-tint-open",
    DISABLED,
    FOCUS_VISIBLE
  ),
  outline: cn(
    SOLID,
    "border-outline-border bg-surface text-ink hover:bg-tint-hover active:bg-tint-pressed",
    DISABLED,
    FOCUS_VISIBLE
  ),
  tertiary: cn(
    "inline-flex items-center gap-2 rounded-pill px-1.5 py-2 font-semibold text-ink underline decoration-[var(--check-border)] underline-offset-[3px] transition-colors hover:decoration-ink",
    DISABLED,
    FOCUS_VISIBLE
  ),
  ghost: cn(
    "inline-flex items-center gap-2 rounded-pill border border-transparent bg-transparent px-3 py-1.5 text-ink-muted transition-colors hover:bg-tint-hover hover:text-ink active:bg-tint-pressed aria-expanded:bg-tint-open aria-expanded:text-ink",
    DISABLED,
    FOCUS_VISIBLE
  ),
  "soft-destructive": cn(
    SOLID,
    "border-transparent bg-critical-soft text-critical hover:bg-[color-mix(in_srgb,var(--status-critical)_16%,var(--surface))] active:bg-[color-mix(in_srgb,var(--status-critical)_22%,var(--surface))]",
    DISABLED,
    FOCUS_VISIBLE
  ),
  destructive: cn(
    SOLID,
    "border-transparent bg-critical text-accent-on hover:bg-[color-mix(in_srgb,var(--status-critical)_88%,#000)] active:bg-[color-mix(in_srgb,var(--status-critical)_76%,#000)]",
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
