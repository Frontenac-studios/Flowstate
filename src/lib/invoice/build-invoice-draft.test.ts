import { describe, expect, it } from "vitest";

import {
  buildInvoiceDraft,
  roundToQuarterSeconds,
  type UnbilledEntry,
} from "./build-invoice-draft";

const H = 3600;
const RATE = 4500; // $45/hr in cents

let seq = 0;
function entry(hours: number, opts?: Partial<UnbilledEntry>): UnbilledEntry {
  seq += 1;
  return {
    id: opts?.id ?? `e${seq}`,
    // Default start times march forward so seq order == age order.
    startedAt: opts?.startedAt ?? new Date(2026, 0, 1, 9, seq),
    seconds: Math.round(hours * H),
    taskId: opts?.taskId ?? null,
    label: opts?.label ?? `Work ${seq}`,
  };
}

describe("buildInvoiceDraft", () => {
  it("bills everything and carries nothing when the pool is under threshold", () => {
    const draft = buildInvoiceDraft({
      entries: [
        entry(2, { label: "Design" }),
        entry(1.5, { label: "Build" }),
        entry(1, { label: "QA" }),
      ],
      thresholdSeconds: 20 * H,
      rateCents: RATE,
    });

    expect(draft.billedEntryIds).toHaveLength(3);
    expect(draft.carriedSecondsExact).toBe(0);
    expect(draft.billedSecondsExact).toBe(4.5 * H);
    expect(draft.atThreshold).toBe(false);
  });

  it("bills whole entries oldest-first up to the threshold and carries the rest", () => {
    const first = entry(8, { id: "a", startedAt: new Date(2026, 0, 1), label: "Phase one" });
    const second = entry(8, { id: "b", startedAt: new Date(2026, 0, 2), label: "Phase two" });
    const third = entry(8, { id: "c", startedAt: new Date(2026, 0, 3), label: "Phase three" });

    const draft = buildInvoiceDraft({
      entries: [third, first, second], // deliberately out of order
      thresholdSeconds: 20 * H,
      rateCents: RATE,
    });

    // 8 + 8 = 16 ≤ 20; adding the third (→24) would exceed, so it carries.
    expect(draft.billedEntryIds).toEqual(["a", "b"]);
    expect(draft.billedSecondsExact).toBe(16 * H);
    expect(draft.carriedSecondsExact).toBe(8 * H);
    expect(draft.atThreshold).toBe(true);
  });

  it("always bills at least the oldest entry, even when it alone exceeds the threshold", () => {
    const draft = buildInvoiceDraft({
      entries: [entry(22, { id: "big", label: "Marathon" }), entry(3, { id: "next" })],
      thresholdSeconds: 20 * H,
      rateCents: RATE,
    });

    expect(draft.billedEntryIds).toEqual(["big"]);
    expect(draft.billedSecondsExact).toBe(22 * H);
    expect(draft.carriedSecondsExact).toBe(3 * H);
  });

  it("reconciles: billed + carried always equals the pool, exactly", () => {
    const entries = [entry(3.1), entry(4.7), entry(9.9), entry(6.3), entry(2.2)];
    const pool = entries.reduce((s, e) => s + e.seconds, 0);
    const draft = buildInvoiceDraft({ entries, thresholdSeconds: 20 * H, rateCents: RATE });

    expect(draft.billedSecondsExact + draft.carriedSecondsExact).toBe(pool);
    expect(draft.poolSecondsExact).toBe(pool);
  });

  it("groups entries that share a task and rounds the line to a quarter hour", () => {
    const draft = buildInvoiceDraft({
      entries: [
        entry(0.5, { taskId: "t1", label: "Reporting" }),
        entry(0.5, { taskId: "t1", label: "Reporting" }),
      ],
      thresholdSeconds: 20 * H,
      rateCents: RATE,
    });

    expect(draft.lines).toHaveLength(1);
    expect(draft.lines[0]!.billedSeconds).toBe(1 * H); // 0.5 + 0.5 = 1.0h
    expect(draft.lines[0]!.amountCents).toBe(RATE); // 1h × $45
  });

  it("prices each line as rounded hours × rate", () => {
    // 1h07m30s = 4050s → rounds up to 1.25h (Math.round(4.5)=5 quarters).
    expect(roundToQuarterSeconds(4050)).toBe(4500);
    const draft = buildInvoiceDraft({
      entries: [entry(4050 / H, { label: "Solo" })],
      thresholdSeconds: 20 * H,
      rateCents: RATE,
    });
    expect(draft.lines[0]!.billedSeconds).toBe(1.25 * H);
    expect(draft.lines[0]!.amountCents).toBe(Math.round(1.25 * RATE));
    expect(draft.amountCents).toBe(draft.lines[0]!.amountCents);
  });

  it("caps at eight lines, folding the smallest into a single Additional work line", () => {
    // Ten distinct 1h lines; seven largest are equal-sized so ties resolve stably,
    // and the three smallest merge into "Additional work" = 3h.
    const entries = Array.from({ length: 10 }, (_, i) =>
      entry(1, { id: `x${i}`, label: `Area ${i}`, taskId: `t${i}` })
    );
    const draft = buildInvoiceDraft({ entries, thresholdSeconds: 100 * H, rateCents: RATE });

    expect(draft.lines).toHaveLength(8);
    const last = draft.lines[draft.lines.length - 1]!;
    expect(last.isAdditional).toBe(true);
    expect(last.seedLabel).toBe("Additional work");
    expect(last.billedSeconds).toBe(3 * H);
    // Every entry is still billed even though they collapsed to 8 lines.
    expect(draft.billedEntryIds).toHaveLength(10);
  });
});
