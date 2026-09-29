import { forwardRef, type CSSProperties, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import "./checkbox.css";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  /** CSS color for the checked fill; defaults to ink. */
  accentColor?: string;
  /** Task completion is a circle (Spec v3); every other checkbox is a square. */
  round?: boolean;
};

/** 18px square checkbox (Spec v3) — a native checkbox restyled via `.kash-checkbox`. */
const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox(
  { className, accentColor = "var(--ink)", round = false, style, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      data-shape={round ? "round" : undefined}
      className={cn(
        "kash-checkbox kash-focus-visible shrink-0 cursor-pointer self-center outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{ "--check-fill": accentColor, ...style } as CSSProperties}
      {...rest}
    />
  );
});

export default Checkbox;
