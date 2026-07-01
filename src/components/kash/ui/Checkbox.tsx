import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Flat check-off control (B&W). A native checkbox tinted to `--accent` via
 * `accent-color`, with a focus ring at `--focus-ring`. Keeping the native
 * appearance (rather than `appearance-none` + a custom tick) gives a robust,
 * accessible OS check mark while still honoring the accent token.
 */
type Props = InputHTMLAttributes<HTMLInputElement>;

const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox(
  { className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-icon-md w-icon-md shrink-0 cursor-pointer rounded-control outline-none [accent-color:var(--accent)]",
        "transition-shadow focus-visible:shadow-[0_0_0_var(--focus-ring-width)_var(--focus-ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...rest}
    />
  );
});

export default Checkbox;
