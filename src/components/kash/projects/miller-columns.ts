/** Minimum Miller column slots shown when the strip is not wide enough for five. */
export const MIN_VISIBLE_COLUMNS = 4;

/** Extra slot when the strip fits five columns at min width (fullscreen / wide desktop). */
export const MAX_VISIBLE_COLUMNS = 5;

/** Matches Tailwind `w-64`. */
export const MILLER_COLUMN_MIN_WIDTH_PX = 256;

/** Matches Tailwind `gap-2` between columns. */
export const MILLER_COLUMN_GAP_PX = 8;

/** Horizontal padding on the Miller strip (`p-2` × 2). */
export const MILLER_STRIP_PADDING_X_PX = 16;

const MIN_INNER_FOR_FIVE_COLUMNS =
  MAX_VISIBLE_COLUMNS * MILLER_COLUMN_MIN_WIDTH_PX +
  (MAX_VISIBLE_COLUMNS - 1) * MILLER_COLUMN_GAP_PX;

/** Viewport width at which we always show five column slots (fullscreen / wide desktop). */
export const VIEWPORT_MIN_FOR_FIVE_COLUMNS = 1280;

function visibleColumnTargetFromStrip(stripContentWidthPx: number): number {
  const inner = stripContentWidthPx - MILLER_STRIP_PADDING_X_PX;
  const fitFive = inner >= MIN_INNER_FOR_FIVE_COLUMNS;
  return fitFive ? MAX_VISIBLE_COLUMNS : MIN_VISIBLE_COLUMNS;
}

function visibleColumnTargetFromViewport(viewportWidthPx: number | undefined): number {
  if (viewportWidthPx == null) return MIN_VISIBLE_COLUMNS;
  return viewportWidthPx >= VIEWPORT_MIN_FOR_FIVE_COLUMNS
    ? MAX_VISIBLE_COLUMNS
    : MIN_VISIBLE_COLUMNS;
}

/** Target real + ghost slots for strip `clientWidth` and optional viewport width. */
export function visibleColumnTarget(stripContentWidthPx: number, viewportWidthPx?: number): number {
  return Math.max(
    visibleColumnTargetFromStrip(stripContentWidthPx),
    visibleColumnTargetFromViewport(viewportWidthPx)
  );
}

export function ghostColumnCount(realCount: number, target: number): number {
  return realCount >= target ? 0 : target - realCount;
}

/**
 * Fixed Miller column width (Tailwind `w-64` = 256px). Columns never stretch to
 * fill the strip: shallow trees leave open canvas to the right, deeper trees
 * scroll horizontally (Finder-style).
 */
export const MILLER_COLUMN_WIDTH_CLASS = "w-64 shrink-0";

/** Minimum Miller column card height (Tailwind min-h-60 = 240px). */
export const MILLER_COLUMN_MIN_HEIGHT_CLASS = "min-h-60";

export function millerColumnShellClass(widthClassName: string): string {
  return `${widthClassName} ${MILLER_COLUMN_MIN_HEIGHT_CLASS} flex h-full min-h-0 flex-col self-stretch`;
}
