import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Icon-led action button: a small pill hit-area in muted ink. Spec v3 states: the
 * context tint fills it on hover and press, and it stays pressed while the menu it
 * opens is showing (`aria-expanded`). The icon is the child; `aria-label` is required
 * for an accessible name.
 */
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
};

const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-pill px-2 py-1 text-ink-muted transition-colors hover:bg-tint-hover hover:text-ink active:bg-tint-pressed disabled:cursor-not-allowed disabled:opacity-40 aria-expanded:bg-tint-open aria-expanded:text-ink motion-reduce:transition-none",
        "kash-focus-visible outline-none",
        className
      )}
      {...rest}
    />
  );
});

export default IconButton;
