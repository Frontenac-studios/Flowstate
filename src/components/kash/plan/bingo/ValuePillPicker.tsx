"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";

type Props = {
  value: string | null;
  onChange: (valueId: string | null) => void;
  /** Optional legend for fieldset; omit for compact popover use. */
  legend?: string;
  className?: string;
};

export default function ValuePillPicker({
  value,
  onChange,
  legend = "Value (optional)",
  className,
}: Props) {
  const trpc = useTRPC();
  const { data: values = [] } = useQuery(trpc.aboutMe.values.list.queryOptions());

  if (values.length === 0) return null;

  return (
    <fieldset className={className ?? "flex flex-col gap-1.5"}>
      {legend ? <legend className="mb-1 text-caption font-medium text-ink">{legend}</legend> : null}
      <div className="flex flex-wrap gap-2">
        {values.map((v) => {
          const selected = value === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(selected ? null : v.id)}
              aria-pressed={selected}
              className={`rounded-chip border px-3 py-1 text-caption font-medium transition ${
                selected
                  ? "border-ink bg-ink text-accent-on"
                  : "border-subtle text-ink-muted hover:text-ink"
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
