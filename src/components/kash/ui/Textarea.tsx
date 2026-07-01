import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Flat multi-line input (replaces `.glass-input .glass-textarea`): same surface
 * + focus ring as Input, with a content-sized min height. Heavily-overridden
 * composer overlays that strip the border/background keep their bespoke inline
 * utilities instead of routing through this component.
 */
type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { className, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[var(--space-8)] rounded-control border border-border bg-surface px-3 py-2 text-body text-ink outline-none transition-shadow [field-sizing:content] focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]",
        className
      )}
      {...rest}
    />
  );
});

export default Textarea;
