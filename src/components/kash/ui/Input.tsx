import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { FIELD_CHROME, FIELD_PILL, FIELD_READ_ONLY } from "./field-styles";

/**
 * Text input (Spec v2): 40px pill, hairline border, ink border + halo on focus,
 * crimson border when `aria-invalid`. Not `w-full` by default — callers add
 * width utilities via `className`.
 */
type Props = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, Props>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn(FIELD_CHROME, FIELD_PILL, FIELD_READ_ONLY, className)}
      {...rest}
    />
  );
});

export default Input;
