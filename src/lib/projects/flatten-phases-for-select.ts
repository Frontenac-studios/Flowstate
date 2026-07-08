export type PhaseSelectRow = {
  id: string;
  name: string;
  parentPhaseId: string | null;
  sortOrder: number;
};

export type FlatPhaseOption = {
  id: string;
  label: string;
  depth: number;
};

function bySortThenName(a: PhaseSelectRow, b: PhaseSelectRow): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name);
}

/** Flatten a project's phase tree for a single <select> (project loose is separate). */
export function flattenPhasesForSelect(phases: PhaseSelectRow[]): FlatPhaseOption[] {
  const childrenByParent = new Map<string, PhaseSelectRow[]>();
  const roots: PhaseSelectRow[] = [];

  for (const phase of phases) {
    if (phase.parentPhaseId === null) {
      roots.push(phase);
    } else {
      const list = childrenByParent.get(phase.parentPhaseId) ?? [];
      list.push(phase);
      childrenByParent.set(phase.parentPhaseId, list);
    }
  }

  roots.sort(bySortThenName);
  for (const list of Array.from(childrenByParent.values())) {
    list.sort(bySortThenName);
  }

  const result: FlatPhaseOption[] = [];
  const walk = (phase: PhaseSelectRow, depth: number) => {
    result.push({
      id: phase.id,
      label: `${depth > 0 ? "— ".repeat(depth) : ""}${phase.name}`,
      depth,
    });
    for (const child of childrenByParent.get(phase.id) ?? []) {
      walk(child, depth + 1);
    }
  };

  for (const root of roots) walk(root, 0);
  return result;
}
