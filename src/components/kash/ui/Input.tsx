import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Flat text input (replaces `.glass-input`): white surface, hairline border,
 * focus ring at `--focus-ring`. Not `w-full` by default — callers add width
 * utilities via `className`.
 */
type Props = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, Props>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "kash-focus-visible rounded-control border border-border bg-surface px-3 py-2 text-body text-ink outline-none transition-shadow",
        className
      )}
      {...rest}
    />
  );
});

export default Input;
