"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/**
 * Spec v3 Cc toggle: a 36×22 pill track (off #d5d8dd, on ink) with an 18px white knob.
 * A real `role="switch"` button — Space/Enter toggle it. Label it with `aria-label`
 * or an adjacent `<label htmlFor>`.
 */
const Switch = forwardRef<HTMLButtonElement, Props>(function Switch(
  { checked, onCheckedChange, className, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "kash-focus-visible relative inline-flex h-[22px] w-9 shrink-0 cursor-pointer items-center rounded-pill outline-none transition-colors motion-reduce:transition-none",
        checked ? "bg-ink" : "bg-outline-border",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0.5 size-[18px] rounded-pill bg-white shadow-[0_1px_2px_rgba(22,24,29,0.2)] transition-transform motion-reduce:transition-none",
          checked && "translate-x-[14px]"
        )}
      />
    </button>
  );
});

export default Switch;
