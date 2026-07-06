import { cn } from "@/lib/cn";

import { KeyCap } from "./KeyCap";

type Props = {
  label: string;
  keys: string;
  className?: string;
};

/** Label followed by a key-cap shortcut — consistent app-wide hint order. */
export function ShortcutHint({ label, keys, className }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span>{label}</span>
      <KeyCap>{keys}</KeyCap>
    </span>
  );
}
