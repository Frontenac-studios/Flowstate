import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Flat multi-line input (replaces `.glass-input .glass-textarea`): same surface
 * + focus ring as Input, with a content-sized min height. Grows to fit content
 * up to `max-h-[40vh]`, then scrolls internally so a long paste can never push
 * the surrounding layout off-screen. Heavily-overridden composer overlays that
 * strip the border/background keep their bespoke inline utilities instead of
 * routing through this component.
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
        "max-h-[40vh] min-h-[var(--space-8)] overflow-y-auto rounded-control border border-border bg-surface px-3 py-2 text-body text-ink outline-none transition-shadow [field-sizing:content] focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]",
        className
      )}
      {...rest}
    />
  );
});

export default Textarea;
