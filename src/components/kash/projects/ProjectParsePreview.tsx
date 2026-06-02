import type { ParseProjectTaskResult } from "@/lib/parser/parse-project-task-input";

function formatDateChip(iso: string | null, bucketOverride: string | null): string | null {
  if (bucketOverride === "later") return "Later";
  if (!iso) return null;
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (iso === todayIso) return "Today";
  return iso;
}

export function getProjectParseChips(parse: ParseProjectTaskResult): string[] {
  const chips: string[] = [];
  const dateLabel = formatDateChip(parse.scheduledDate, parse.bucketOverride);
  if (dateLabel) chips.push(dateLabel);
  if (parse.priority > 0) chips.push("!".repeat(parse.priority));
  if (parse.projectSlug) chips.push(`#${parse.projectSlug}`);
  if (parse.parentDirName) chips.push(parse.parentDirName);
  return chips;
}

type Props = {
  parse: ParseProjectTaskResult;
};

export default function ProjectParsePreview({ parse }: Props) {
  const chips = getProjectParseChips(parse);
  if (chips.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1" aria-live="polite">
      {chips.map((chip) => (
        <span key={chip} className="glass-pill px-1.5 py-0.5 text-[10px] text-kash-ink-muted">
          {chip}
        </span>
      ))}
    </div>
  );
}
