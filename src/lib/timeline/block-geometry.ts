/** Shared absolute positioning for timeline blocks (focus, protected, external). */

const HOUR_GUTTER = "2.75rem";
/** Pixel gap between overlapping columns — keeps blocks full-width without rem inset. */
const COLUMN_GAP_PX = 2;

export function timelineBlockStyle(
  layout: { col: number; cols: number },
  top: number,
  height: number
): { top: number; height: number; left: string; width: string } {
  const widthPct = 100 / layout.cols;
  const leftPct = layout.col * widthPct;
  return {
    top,
    height,
    left: `calc(${HOUR_GUTTER} + ${leftPct}%)`,
    width: `calc(${widthPct}% - ${COLUMN_GAP_PX}px)`,
  };
}
