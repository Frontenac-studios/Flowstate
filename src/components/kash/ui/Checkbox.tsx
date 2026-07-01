import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  /** CSS color for the native checkbox tint; defaults to ink. */
  accentColor?: string;
};

const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox(
  { className, accentColor = "var(--ink)", style, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "kash-focus-visible h-icon-md w-icon-md shrink-0 cursor-pointer rounded-control outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{ accentColor, ...style }}
      {...rest}
    />
  );
});

export default Checkbox;
