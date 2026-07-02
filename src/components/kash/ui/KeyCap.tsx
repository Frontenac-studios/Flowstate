import { cn } from "@/lib/cn";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/** D38 / V5 — keyboard hint rendered as a visible key cap. */
export function KeyCap({ children, className }: Props) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-[1.25rem] items-center justify-center rounded border border-border bg-surface-2 px-1.5 py-0.5 font-sans text-caption text-ink-muted",
        className
      )}
    >
      {children}
    </kbd>
  );
}
