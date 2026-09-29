import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { FIELD_CHROME, FIELD_READ_ONLY } from "./field-styles";

/**
 * Multi-line input (Spec v2): same border + focus treatment as Input, but the
 * 14px container radius instead of a pill, with a content-sized min height. Grows to fit content
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
        FIELD_CHROME,
        FIELD_READ_ONLY,
        "max-h-[40vh] min-h-[var(--space-7)] overflow-y-auto rounded-card px-4 py-2.5 [field-sizing:content]",
        className
      )}
      {...rest}
    />
  );
});

export default Textarea;
