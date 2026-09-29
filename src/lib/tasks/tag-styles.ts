/**
 * Spec v3 "Ta" — tags carry an optional KIND (what sort of label it is) and an
 * opt-in COLOUR. Tags themselves stay plain names on the task (`tasks.tags`); their
 * kind and colour live per user in `task_tag_styles`, keyed by the lower-cased name.
 *
 * Colour is opt-in and deliberately kept apart from project colours: a muted set of
 * five. Only coloured tags show on task rows (coloured first); gray tags appear in
 * the task detail only. Four STATUS tags are built in, each with a default colour,
 * and they also show in the nav with counts. A stored style overrides a built-in.
 */
export const TAG_KINDS = ["status", "type", "effort", "people"] as const;
export type TagKind = (typeof TAG_KINDS)[number];

export const TAG_KIND_LABELS: Record<TagKind, string> = {
  status: "Status",
  type: "Type",
  effort: "Effort",
  people: "People",
};

export const TAG_COLORS = ["sand", "rose", "sky", "lilac", "sage"] as const;
export type TagColor = (typeof TAG_COLORS)[number];

export const TAG_COLOR_LABELS: Record<TagColor, string> = {
  sand: "Sand",
  rose: "Rose",
  sky: "Sky",
  lilac: "Lilac",
  sage: "Sage",
};

export type TagStyle = { kind: TagKind | null; color: TagColor | null };

/** Stored overrides, keyed by `tagKey(name)`. */
export type TagStyleMap = ReadonlyMap<string, TagStyle>;

export const BUILTIN_STATUS_TAGS: ReadonlyArray<{ name: string; color: TagColor }> = [
  { name: "waiting on", color: "sand" },
  { name: "blocked", color: "rose" },
  { name: "in review", color: "sky" },
  { name: "needs info", color: "lilac" },
];

/** Tag identity is case-insensitive, matching normalizeTaskTags. */
export function tagKey(name: string): string {
  return name.trim().toLowerCase();
}

export function isTagKind(value: unknown): value is TagKind {
  return typeof value === "string" && (TAG_KINDS as readonly string[]).includes(value);
}

export function isTagColor(value: unknown): value is TagColor {
  return typeof value === "string" && (TAG_COLORS as readonly string[]).includes(value);
}

const BUILTIN_BY_KEY = new Map(
  BUILTIN_STATUS_TAGS.map((t) => [tagKey(t.name), { kind: "status" as const, color: t.color }])
);

/** A tag's kind + colour: the stored style, else a built-in status, else plain gray. */
export function resolveTagStyle(name: string, stored: TagStyleMap): TagStyle {
  const key = tagKey(name);
  return stored.get(key) ?? BUILTIN_BY_KEY.get(key) ?? { kind: null, color: null };
}

/** Coloured tags only, in their original order — what a task row shows. */
export function colouredTags(tags: readonly string[], stored: TagStyleMap): string[] {
  return tags.filter((t) => resolveTagStyle(t, stored).color !== null);
}

export type TagKindGroup = { kind: TagKind | null; tags: string[] };

/**
 * The detail sheet's rows: Status, Type, Effort, People (always, so each can take an
 * "+ Add"), then "Other" for tags with no kind (only when there are any). Within a
 * row, coloured tags first.
 */
export function groupTagsByKind(tags: readonly string[], stored: TagStyleMap): TagKindGroup[] {
  const byKind = new Map<TagKind | null, string[]>();
  for (const tag of tags) {
    const { kind } = resolveTagStyle(tag, stored);
    byKind.set(kind, [...(byKind.get(kind) ?? []), tag]);
  }
  const colouredFirst = (list: string[]) =>
    [...list].sort(
      (a, b) =>
        Number(resolveTagStyle(b, stored).color !== null) -
        Number(resolveTagStyle(a, stored).color !== null)
    );
  const groups: TagKindGroup[] = TAG_KINDS.map((kind) => ({
    kind,
    tags: colouredFirst(byKind.get(kind) ?? []),
  }));
  const other = byKind.get(null) ?? [];
  if (other.length > 0) groups.push({ kind: null, tags: colouredFirst(other) });
  return groups;
}

/** CSS vars for a colour (tokens.css --tag-<colour>-fill/-ink/-dot); gray when null. */
export function tagColorVars(color: TagColor | null): { fill: string; ink: string; dot: string } {
  if (!color) {
    return { fill: "var(--active-surface)", ink: "var(--ink)", dot: "var(--ink-faint)" };
  }
  return {
    fill: `var(--tag-${color}-fill)`,
    ink: `var(--tag-${color}-ink)`,
    dot: `var(--tag-${color}-dot)`,
  };
}
