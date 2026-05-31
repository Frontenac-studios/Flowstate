"use client";

import type { ProjectTree } from "@/lib/projects/phase-tree";

import type { ProjectPhase, ProjectTask } from "./types";

type Props = {
  tree: ProjectTree<ProjectPhase, ProjectTask>;
};

function countDatedPhases(tree: ProjectTree<ProjectPhase, ProjectTask>): number {
  let count = 0;
  const walk = (nodes: ProjectTree<ProjectPhase, ProjectTask>["rootPhases"]) => {
    for (const node of nodes) {
      if (node.phase.startDate && node.phase.endDate) count += 1;
      walk(node.children);
    }
  };
  walk(tree.rootPhases);
  return count;
}

export default function CalendarBoardView({ tree }: Props) {
  const dated = countDatedPhases(tree);
  return (
    <div className="glass-panel-opaque px-6 py-12 text-center text-kash-ink-muted">
      Calendar Gantt board scaffold — {dated} dated phase{dated === 1 ? "" : "s"} ready to plot.
      Draggable bars land in the final step.
    </div>
  );
}
