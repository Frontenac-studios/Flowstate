import type { EvidenceAnchor, EvidenceNarrative } from "@/db/schema/evidence-editions";
import { categorySeedLabel } from "@/lib/projects/category-tokens";
import type { ProjectCategory } from "@/lib/projects/categories";

export type EditionInput = {
  periodStart: string;
  periodEnd: string;
  anchors: EvidenceAnchor[];
  categoryCounts: Partial<Record<ProjectCategory, number>>;
};

export function templateEvidenceNarrative(input: EditionInput): EvidenceNarrative {
  const winCount = input.anchors.filter((a) => a.type === "win").length;
  const reflectionCount = input.anchors.filter((a) => a.type === "reflection").length;

  const topCategory = Object.entries(input.categoryCounts).sort((a, b) => b[1] - a[1])[0];
  const categoryLine = topCategory
    ? `You kept showing up for ${categorySeedLabel(topCategory[0] as ProjectCategory).toLowerCase()}.`
    : "";

  let throughline = "";
  if (winCount === 0 && reflectionCount === 0) {
    throughline = "A quieter stretch — and you still kept the thread.";
  } else if (winCount > 0) {
    throughline =
      `You named ${winCount} win${winCount === 1 ? "" : "s"} in your own words. ${categoryLine}`.trim();
  } else {
    throughline =
      `You wrote ${reflectionCount} reflection${reflectionCount === 1 ? "" : "s"}. ${categoryLine}`.trim();
  }

  return {
    throughline,
    anchors: input.anchors.slice(0, 40),
  };
}
