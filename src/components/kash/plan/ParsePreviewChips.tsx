import type { ParsedLine, ParseResult } from "@/lib/parser/parse-quick-input";

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

export function getParseChips(parse: ParseResult): string[] {
  const chips: string[] = [];
  const dateLabel = formatDateChip(parse.scheduledDate, parse.bucketOverride);
  if (dateLabel) chips.push(dateLabel);
  if (parse.projectSlug) chips.push(`#${parse.projectSlug}`);
  if (parse.priority > 0) chips.push("!".repeat(parse.priority));
  return chips;
}

function ChipRow({ chips }: { chips: string[] }) {
  if (chips.length === 0) return null;
  return (
    <>
      {chips.map((chip) => (
        <span key={chip} className="glass-pill shrink-0 px-2 py-0.5 text-xs text-kash-ink-muted">
          {chip}
        </span>
      ))}
    </>
  );
}

export function ParsePreviewChips({ parse }: Props) {
  const chips = getParseChips(parse);
  if (chips.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-live="polite">
      <ChipRow chips={chips} />
    </div>
  );
}

type MultiLineProps = {
  lines: ParsedLine[];
};

export function MultiLineParsePreview({ lines }: MultiLineProps) {
  if (lines.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1.5" aria-live="polite">
      {lines.map((line) => {
        const chips = getParseChips(line.parse);
        return (
          <li
            key={line.lineIndex}
            className="flex min-w-0 items-center gap-2 text-xs text-kash-ink-muted"
          >
            <span className="min-w-0 flex-1 truncate">{line.parse.title}</span>
            <span className="flex shrink-0 flex-wrap justify-end gap-1">
              <ChipRow chips={chips} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
