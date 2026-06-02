export type LayoutInput = { startMin: number; endMin: number };

export type LaidOut<T> = T & {
  /** Zero-based column index within the overlap cluster. */
  col: number;
  /** Total columns in this block's overlap cluster. */
  cols: number;
};

/**
 * Assign side-by-side columns to overlapping time blocks (classic calendar layout).
 * Blocks that overlap (transitively) form a cluster and share a column count; the
 * caller maps `col/cols` to `left% = col/cols`, `width% = 1/cols`.
 */
export function layoutBlocks<T extends LayoutInput>(blocks: T[]): LaidOut<T>[] {
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const result: LaidOut<T>[] = [];
  let cluster: Array<T & { col: number }> = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;

  const flush = () => {
    if (cluster.length === 0) return;
    const cols = cluster.reduce((max, b) => Math.max(max, b.col + 1), 0);
    for (const b of cluster) result.push({ ...b, cols });
    cluster = [];
    clusterEnd = Number.NEGATIVE_INFINITY;
  };

  for (const block of sorted) {
    // A block that starts at/after every current block's end begins a new cluster.
    if (cluster.length > 0 && block.startMin >= clusterEnd) {
      flush();
    }

    const usedCols = new Set(cluster.filter((b) => b.endMin > block.startMin).map((b) => b.col));
    let col = 0;
    while (usedCols.has(col)) col += 1;

    cluster.push({ ...block, col });
    clusterEnd = Math.max(clusterEnd, block.endMin);
  }

  flush();
  return result;
}
