import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/cn";

import { kashIconProps } from "./icon";

/** Crimson field edge for invalid controls (§7.6). */
export const inlineValidationFieldClass = "border-critical shadow-[inset_0_0_0_1px_var(--crimson)]";

type Props = {
  message: string;
  className?: string;
};

export default function InlineValidation({ message, className }: Props) {
  return (
    <p
      className={cn(
        "mt-[var(--space-2)] flex items-start gap-[var(--space-2)] text-meta text-critical",
        className
      )}
      role="alert"
    >
      <AlertCircle
        {...kashIconProps({ tokenSize: "sm", className: "mt-0.5 shrink-0" })}
        aria-hidden
      />
      <span>{message}</span>
    </p>
  );
}
