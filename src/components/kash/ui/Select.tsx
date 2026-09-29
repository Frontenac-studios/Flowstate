import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { FIELD_CHROME } from "./field-styles";

/**
 * Select (Spec v3 Cc): a 38px field with the 14px container radius, and the same
 * border and focus treatment as Input. Native chevron is kept (no custom
 * appearance). For 2–3 short options use InPageSwitcher (a segmented pill) instead.
 */
type Props = SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, Props>(function Select({ className, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(FIELD_CHROME, "h-[38px] rounded-card px-4", className)}
      {...rest}
    />
  );
});

export default Select;
