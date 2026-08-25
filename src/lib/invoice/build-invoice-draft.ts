/**
 * The deterministic invoice-draft engine (W4, docs/v1-scope.md). This owns ALL
 * invoice math — which entries bill, the threshold cap, carry-forward, the
 * quarter-hour rounding, and the reduction to ≤8 client-facing lines — so the AI
 * wording step (src/server/invoice/draft-line-items.ts) never computes an hour or
 * a dollar. It is a pure function: same inputs, same numbers, fully tested.
 *
 * Ported from the `/invoice` skill's build_invoice.py, with one deliberate
 * difference forced by the architecture: the skill splits the single entry that
 * crosses the threshold to bill an exactly-20h invoice, because it works on a
 * throwaway description summary. Here entries are rows in a persistent time log
 * that also carries the `invoiced_at` double-bill guard, and half a row cannot be
 * marked billed. So we bill **whole entries, oldest-first**, taking the longest
 * age-ordered run whose total stays within the threshold (always at least the
 * oldest entry, so a single over-long entry can never stall billing). The invoice
 * lands at or under the threshold; the remaining whole entries carry forward and
 * bill first next time. "Capped at the threshold" is honoured; the numbers stay
 * true to the log.
 */

/** Billing granularity: invoice lines round to the nearest quarter hour. */
const QUARTER_SECONDS = 900;
const SECONDS_PER_HOUR = 3600;
const DEFAULT_MAX_LINES = 8;
const ADDITIONAL_WORK_LABEL = "Additional work";

/** One unbilled, billable time entry for a single client. */
export type UnbilledEntry = {
  id: string;
  /** Ordering key for oldest-first billing. */
  startedAt: Date;
  /** Exact tracked duration, in seconds. */
  seconds: number;
  /** Task id when the entry is task-linked; else null (bare project + description). */
  taskId: string | null;
  /** The raw timer description or task title — the seed for a client-facing label. */
  label: string;
};

/** A grouped, client-facing draft line before the AI writes its final wording. */
export type DraftLine = {
  /** Stable grouping key (task id, normalized description, or the merge bucket). */
  key: string;
  /** Seed label from the work — the AI rewrites this; "Additional work" is kept. */
  seedLabel: string;
  /** Every raw timer description folded into this line, for the AI to summarize. */
  rawLabels: string[];
  /** Billed duration for this line, quarter-hour rounded (a multiple of 900). */
  billedSeconds: number;
  /** This line's amount, in cents = rounded hours × rate. */
  amountCents: number;
  sortOrder: number;
  /** True for the merged "Additional work" catch-all line. */
  isAdditional: boolean;
};

export type InvoiceDraft = {
  /** Ids of every entry this draft bills — stamped `invoice_id` on acceptance. */
  billedEntryIds: string[];
  /** The ≤8 client-facing lines. */
  lines: DraftLine[];
  /** Exact billed seconds (sum of billed entries, un-rounded). */
  billedSecondsExact: number;
  /** Invoiced seconds after rounding (sum of the lines). */
  billedSecondsRounded: number;
  /** Exact still-unbilled seconds carried to the next invoice. */
  carriedSecondsExact: number;
  /** The dollar total, in cents (sum of the lines). */
  amountCents: number;
  /** Exact seconds in the whole unbilled pool (billed + carried). */
  poolSecondsExact: number;
  /** Whether the pool has reached the billing threshold. */
  atThreshold: boolean;
};

export type BuildDraftInput = {
  entries: readonly UnbilledEntry[];
  thresholdSeconds: number;
  rateCents: number;
  maxLines?: number;
};

/** Round a duration in seconds to the nearest quarter hour (15 min). */
export function roundToQuarterSeconds(seconds: number): number {
  return Math.round(seconds / QUARTER_SECONDS) * QUARTER_SECONDS;
}

/** Cents billed for a quarter-hour-rounded duration at a given hourly rate. */
export function lineAmountCents(roundedSeconds: number, rateCents: number): number {
  return Math.round((roundedSeconds / SECONDS_PER_HOUR) * rateCents);
}

function normalizeDescription(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Choose the whole entries to bill, oldest-first: the longest age-ordered run
 * whose total stays within the threshold, but always at least the oldest entry so
 * one over-long entry can never stall the queue.
 */
function selectBilledEntries(
  sorted: readonly UnbilledEntry[],
  thresholdSeconds: number
): { billed: UnbilledEntry[]; carried: UnbilledEntry[] } {
  const billed: UnbilledEntry[] = [];
  let running = 0;
  let i = 0;
  for (; i < sorted.length; i++) {
    const entry = sorted[i]!;
    const isFirst = running === 0;
    if (isFirst || running + entry.seconds <= thresholdSeconds) {
      billed.push(entry);
      running += entry.seconds;
    } else {
      break;
    }
  }
  return { billed, carried: sorted.slice(i) };
}

/** Group billed entries by task (or normalized description), preserving first-seen order. */
function groupBilled(billed: readonly UnbilledEntry[]): DraftLine[] {
  const groups = new Map<string, DraftLine>();
  for (const entry of billed) {
    const key = entry.taskId ?? `desc:${normalizeDescription(entry.label) || "(no description)"}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rawLabels.push(entry.label);
      existing.billedSeconds += entry.seconds; // exact for now; rounded below
    } else {
      groups.set(key, {
        key,
        seedLabel: entry.label.trim() || "Work",
        rawLabels: [entry.label],
        billedSeconds: entry.seconds,
        amountCents: 0,
        sortOrder: 0,
        isAdditional: false,
      });
    }
  }
  return Array.from(groups.values());
}

/**
 * Reduce to at most `maxLines` lines by keeping the largest and folding the
 * smallest groups into a single "Additional work" line (Kat's rule). Runs on the
 * exact grouped seconds; rounding to the quarter hour happens once, after.
 */
function reduceToMaxLines(groups: DraftLine[], maxLines: number): DraftLine[] {
  if (groups.length <= maxLines) return groups;

  const bySizeDesc = [...groups].sort((a, b) => b.billedSeconds - a.billedSeconds);
  const kept = bySizeDesc.slice(0, maxLines - 1);
  const merged = bySizeDesc.slice(maxLines - 1);

  const additional: DraftLine = {
    key: "additional-work",
    seedLabel: ADDITIONAL_WORK_LABEL,
    rawLabels: merged.flatMap((g) => g.rawLabels),
    billedSeconds: merged.reduce((sum, g) => sum + g.billedSeconds, 0),
    amountCents: 0,
    sortOrder: 0,
    isAdditional: true,
  };
  return [...kept, additional];
}

/**
 * Build a per-client invoice draft from its unbilled billable entries. Returns the
 * billed entry ids, the ≤8 lines with rounded hours and amounts, and the
 * carry-forward. Wording is left blank-ish (seed labels) for the AI step.
 */
export function buildInvoiceDraft(input: BuildDraftInput): InvoiceDraft {
  const maxLines = input.maxLines ?? DEFAULT_MAX_LINES;
  const poolSecondsExact = input.entries.reduce((sum, e) => sum + e.seconds, 0);

  const sorted = [...input.entries].sort((a, b) => {
    const byTime = a.startedAt.getTime() - b.startedAt.getTime();
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  });

  const { billed, carried } = selectBilledEntries(sorted, input.thresholdSeconds);
  const billedSecondsExact = billed.reduce((sum, e) => sum + e.seconds, 0);
  const carriedSecondsExact = carried.reduce((sum, e) => sum + e.seconds, 0);

  const grouped = reduceToMaxLines(groupBilled(billed), maxLines);

  // Round each line once, here at line generation, then price it.
  const lines: DraftLine[] = grouped
    .map((line) => {
      const rounded = roundToQuarterSeconds(line.billedSeconds);
      return {
        ...line,
        billedSeconds: rounded,
        amountCents: lineAmountCents(rounded, input.rateCents),
      };
    })
    // A group under 7.5 min rounds to zero — drop it from the client's view; its
    // entry is still billed (invoice_id stamped) so it never resurfaces.
    .filter((line) => line.billedSeconds > 0)
    .sort((a, b) => {
      if (a.isAdditional !== b.isAdditional) return a.isAdditional ? 1 : -1;
      return b.billedSeconds - a.billedSeconds;
    })
    .map((line, index) => ({ ...line, sortOrder: index }));

  const billedSecondsRounded = lines.reduce((sum, l) => sum + l.billedSeconds, 0);
  const amountCents = lines.reduce((sum, l) => sum + l.amountCents, 0);

  return {
    billedEntryIds: billed.map((e) => e.id),
    lines,
    billedSecondsExact,
    billedSecondsRounded,
    carriedSecondsExact,
    amountCents,
    poolSecondsExact,
    atThreshold: poolSecondsExact >= input.thresholdSeconds,
  };
}
