import type { ParseResult } from "@/lib/parser/parse-quick-input";

type Props = {
  parse: ParseResult;
};

function formatDateChip(iso: string | null, bucketOverride: string | null): string | null {
  if (bucketOverride === "later") return "Later";
  if (!iso) return null;
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (iso === todayIso) return "Today";
  return iso;
}

export function ParsePreviewChips({ parse }: Props) {
  const chips: string[] = [];

  const dateLabel = formatDateChip(parse.scheduledDate, parse.bucketOverride);
  if (dateLabel) chips.push(dateLabel);
  if (parse.projectSlug) chips.push(`#${parse.projectSlug}`);
  if (parse.priority > 0) chips.push("!".repeat(parse.priority));

  if (chips.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-live="polite">
      {chips.map((chip) => (
        <span key={chip} className="glass-pill px-2 py-0.5 text-xs text-kash-ink-muted">
          {chip}
        </span>
      ))}
    </div>
  );
}
