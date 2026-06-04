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

function firstIncompleteChild<P extends PhaseWithCompletion, T extends TaskShape>(
  node: PhaseTreeNode<P, T>
): PhaseTreeNode<P, T> | null {
  for (const child of node.children) {
    if (child.phase.completedAt === null) return child;
  }
  return null;
}

/** Prune invalid ids from the tail, then append first incomplete child per level. */
export function expandMillerPath<P extends PhaseWithCompletion, T extends TaskShape>(
  tree: ProjectTree<P, T>,
  path: string[],
  maxColumns: number
): string[] {
  const maxPathLength = Math.max(0, maxColumns - 1);
  if (path.length === 0 || maxPathLength === 0) return [];

  const result: string[] = [];
  for (const id of path) {
    const parent = result.length === 0 ? null : resolveNodeAtPath(tree, result);
    const siblings = parent === null ? tree.rootPhases : parent.children;
    const next = siblings.find((n) => n.phase.id === id);
    if (!next) break;
    result.push(id);
  }

  while (result.length < maxPathLength) {
    const node = resolveNodeAtPath(tree, result);
    if (!node) break;
    const child = firstIncompleteChild(node);
    if (!child) break;
    result.push(child.phase.id);
  }

  return result;
}

/** First incomplete root with content, expanded to the column budget. */
export function defaultMillerPath<P extends PhaseWithCompletion, T extends TaskShape>(
  tree: ProjectTree<P, T>,
  maxColumns: number
): string[] {
  const firstRoot = tree.rootPhases.find(
    (n) => n.phase.completedAt === null && (n.children.length > 0 || n.tasks.length > 0)
  );
  if (!firstRoot) return [];
  return expandMillerPath(tree, [firstRoot.phase.id], maxColumns);
}
