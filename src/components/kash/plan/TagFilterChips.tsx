"use client";

import { useTagStyles } from "@/hooks/useTagStyles";
import { resolveTagStyle, tagColorVars, tagKey } from "@/lib/tasks/tag-styles";

type Props = {
  /** Tags on every task in the list (before filtering), for the counts. */
  taskTags: ReadonlyArray<readonly string[] | null | undefined>;
  total: number;
  selected: readonly string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
  className?: string;
};

/**
 * Spec v3 "Ta" filter chips: 32px pills with a hairline outline, "All n" first, then
 * each tag on the list with its count — coloured tags first. Selected = filled ink.
 */
export function TagFilterChips({
  taskTags,
  total,
  selected,
  onToggle,
  onClear,
  className = "",
}: Props) {
  const styles = useTagStyles();
  const counts = new Map<string, { name: string; count: number }>();
  for (const tags of taskTags) {
    for (const tag of tags ?? []) {
      const key = tagKey(tag);
      const entry = counts.get(key) ?? { name: tag, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
  }
  if (counts.size === 0) return null;
  const selectedKeys = new Set(selected.map(tagKey));
  const chips = Array.from(counts.values()).sort((a, b) => {
    const colour =
      Number(resolveTagStyle(b.name, styles).color !== null) -
      Number(resolveTagStyle(a.name, styles).color !== null);
    return colour !== 0 ? colour : b.count - a.count || a.name.localeCompare(b.name);
  });

  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="group" aria-label="Filter by tag">
      <FilterChip label="All" count={total} pressed={selected.length === 0} onClick={onClear} />
      {chips.map(({ name, count }) => (
        <FilterChip
          key={tagKey(name)}
          label={name}
          count={count}
          dot={resolveTagStyle(name, styles).color}
          pressed={selectedKeys.has(tagKey(name))}
          onClick={() => onToggle(name)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  count,
  dot,
  pressed,
  onClick,
}: {
  label: string;
  count: number;
  dot?: ReturnType<typeof resolveTagStyle>["color"];
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`kash-focus-visible inline-flex h-8 items-center gap-1.5 rounded-pill border px-3.5 text-meta font-semibold outline-none transition-colors ${
        pressed
          ? "border-ink bg-ink text-accent-on"
          : "border-outline-border bg-surface text-ink hover:bg-tint-hover"
      }`}
    >
      {dot ? (
        <span
          aria-hidden
          className="size-1.5 rounded-pill"
          style={{ backgroundColor: tagColorVars(dot).dot }}
        />
      ) : null}
      {label}
      <span className="font-medium opacity-70">{count}</span>
    </button>
  );
}
