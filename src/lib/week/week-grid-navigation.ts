/**
 * 2D arrow-key navigation across the Week grid (D5). Each navigable column —
 * the seven weekday columns in order, then the inbox rail — carries the ids of
 * its selectable rows (pinned day-priority slots and drop-only zones are not
 * TaskRows, so they're excluded upstream). Up/Down move within a column; Left/
 * Right jump to the nearest non-empty column, keeping the row index where it
 * fits. All movement clamps — no wrap. With nothing selected, any arrow lands on
 * the first selectable row.
 */
export type WeekNavColumn = { taskIds: string[] };

export type WeekNavDirection = "up" | "down" | "left" | "right";

type Position = { col: number; index: number };

function locate(columns: WeekNavColumn[], id: string | null): Position | null {
  if (!id) return null;
  for (let col = 0; col < columns.length; col += 1) {
    const index = columns[col]!.taskIds.indexOf(id);
    if (index !== -1) return { col, index };
  }
  return null;
}

function firstSelectableId(columns: WeekNavColumn[]): string | null {
  for (const column of columns) {
    if (column.taskIds.length > 0) return column.taskIds[0]!;
  }
  return null;
}

/** Nearest non-empty column strictly in `step` direction, or null if none. */
function seekColumn(columns: WeekNavColumn[], from: number, step: 1 | -1): number | null {
  for (let col = from + step; col >= 0 && col < columns.length; col += step) {
    if (columns[col]!.taskIds.length > 0) return col;
  }
  return null;
}

export function moveWeekSelection(
  columns: WeekNavColumn[],
  currentId: string | null,
  direction: WeekNavDirection
): string | null {
  const current = locate(columns, currentId);
  if (!current) return firstSelectableId(columns);

  if (direction === "up" || direction === "down") {
    const rows = columns[current.col]!.taskIds;
    const nextIndex = Math.min(
      Math.max(current.index + (direction === "down" ? 1 : -1), 0),
      rows.length - 1
    );
    return rows[nextIndex]!;
  }

  const targetCol = seekColumn(columns, current.col, direction === "right" ? 1 : -1);
  if (targetCol === null) return currentId;

  const rows = columns[targetCol]!.taskIds;
  const clampedIndex = Math.min(current.index, rows.length - 1);
  return rows[clampedIndex]!;
}
