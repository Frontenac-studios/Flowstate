import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { FIELD_CHROME, FIELD_PILL } from "./field-styles";

/**
 * Select (Spec v2): same 40px pill, border and focus treatment as Input. Native
 * chevron is kept (no custom appearance).
 */
type Props = SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, Props>(function Select({ className, ...rest }, ref) {
  return <select ref={ref} className={cn(FIELD_CHROME, FIELD_PILL, className)} {...rest} />;
});

export default Select;
