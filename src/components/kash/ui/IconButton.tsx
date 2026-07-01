import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Icon-led action button (the flat replacement for `.glass-icon-btn`): a small
 * square hit-area, muted ink, hairline border + inset surface on hover. The icon
 * is the child; `aria-label` is required for an accessible name.
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
        "inline-flex items-center justify-center rounded-chip border border-transparent px-2 py-1 text-ink-muted transition hover:border-border hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50",
        "outline-none focus-visible:outline focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-offset-[var(--focus-ring-offset)] focus-visible:outline-[var(--focus-ring)]",
        className
      )}
      {...rest}
    />
  );
});

export default IconButton;
