import type { PhaseTreeNode, PhaseShape, ProjectTree, TaskShape } from "./phase-tree";

type PhaseWithCompletion = PhaseShape & { completedAt: Date | null };

function resolveNodeAtPath<P extends PhaseWithCompletion, T extends TaskShape>(
  tree: ProjectTree<P, T>,
  path: string[]
): PhaseTreeNode<P, T> | null {
  let currentPhases = tree.rootPhases;
  let node: PhaseTreeNode<P, T> | null = null;

  for (const id of path) {
    node = currentPhases.find((n) => n.phase.id === id) ?? null;
    if (!node) return null;
    currentPhases = node.children;
  }

  return node;
}

/**
 * Drop invalid ids from the path and cap length to the column budget.
 * Does not auto-append children — depth is click-driven; empty slots use ghosts.
 */
export function pruneMillerPath<P extends PhaseWithCompletion, T extends TaskShape>(
  tree: ProjectTree<P, T>,
  path: string[],
  maxColumns: number
): string[] {
  const maxPathLength = Math.max(0, maxColumns - 1);
  if (path.length === 0 || maxPathLength === 0) return [];

  const result: string[] = [];
  for (const id of path) {
    if (result.length >= maxPathLength) break;
    const parent = result.length === 0 ? null : resolveNodeAtPath(tree, result);
    const siblings = parent === null ? tree.rootPhases : parent.children;
    const next = siblings.find((n) => n.phase.id === id);
    if (!next) break;
    result.push(id);
  }

  return result;
}

/**
 * @deprecated Use {@link pruneMillerPath}. Kept as an alias — no longer auto-pads children.
 */
export function expandMillerPath<P extends PhaseWithCompletion, T extends TaskShape>(
  tree: ProjectTree<P, T>,
  path: string[],
  maxColumns: number
): string[] {
  return pruneMillerPath(tree, path, maxColumns);
}

/** First incomplete root with content — path is that root only (no child padding). */
export function defaultMillerPath<P extends PhaseWithCompletion, T extends TaskShape>(
  tree: ProjectTree<P, T>,
  maxColumns: number
): string[] {
  const firstRoot = tree.rootPhases.find(
    (n) => n.phase.completedAt === null && (n.children.length > 0 || n.tasks.length > 0)
  );
  if (!firstRoot) return [];
  return pruneMillerPath(tree, [firstRoot.phase.id], maxColumns);
}
