import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Flat select (replaces `.glass-input` applied to a `<select>`): same surface,
 * border, and focus ring as Input. Native chevron is kept (no custom appearance).
 */
type Props = SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, Props>(function Select({ className, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "rounded-control border border-border bg-surface px-3 py-2 text-ink outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--focus-ring)]",
        className
      )}
      {...rest}
    />
  );
});

export default Select;
