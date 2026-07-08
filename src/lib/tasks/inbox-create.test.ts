import { describe, expect, it } from "vitest";

import { parseQuickInput } from "@/lib/parser/parse-quick-input";

import { resolveInboxCreateFields } from "./inbox-create";

const ctx = { projects: [] as { slug: string; name: string }[] };
const ref = new Date(2026, 6, 8); // Wednesday Jul 8, 2026

describe("resolveInboxCreateFields", () => {
  it("plain title lands in inbox with no suggested date", () => {
    const parse = parseQuickInput("pay water bill", { ...ctx, today: ref });
    expect(resolveInboxCreateFields(parse)).toEqual({
      scheduledDate: null,
      bucketOverride: "later",
      suggestedScheduledDate: null,
    });
  });

  it("semicolon tomorrow becomes a suggested date", () => {
    const parse = parseQuickInput("pay water bill; tomorrow", { ...ctx, today: ref });
    expect(resolveInboxCreateFields(parse)).toEqual({
      scheduledDate: null,
      bucketOverride: "later",
      suggestedScheduledDate: "2026-07-09",
    });
  });

  it("inline tomorrow becomes a suggested date", () => {
    const parse = parseQuickInput("pay water bill tomorrow", { ...ctx, today: ref });
    expect(resolveInboxCreateFields(parse)).toEqual({
      scheduledDate: null,
      bucketOverride: "later",
      suggestedScheduledDate: "2026-07-09",
    });
  });

  it("semicolon weekday becomes a suggested date", () => {
    const parse = parseQuickInput("pay water bill; thu", { ...ctx, today: ref });
    expect(resolveInboxCreateFields(parse)).toEqual({
      scheduledDate: null,
      bucketOverride: "later",
      suggestedScheduledDate: "2026-07-09",
    });
  });

  it("explicit later clears any suggested date", () => {
    const parse = parseQuickInput("someday task; later", { ...ctx, today: ref });
    expect(resolveInboxCreateFields(parse)).toEqual({
      scheduledDate: null,
      bucketOverride: "later",
      suggestedScheduledDate: null,
    });
  });

  it("ISO date segment becomes a suggested date", () => {
    const parse = parseQuickInput("ship deck; 2026-07-10", { ...ctx, today: ref });
    expect(resolveInboxCreateFields(parse)).toEqual({
      scheduledDate: null,
      bucketOverride: "later",
      suggestedScheduledDate: "2026-07-10",
    });
  });

  it("row 5: manual createInInbox with '; tomorrow' matches the chat inbox contract", () => {
    // Same landing as a chat-created task: unscheduled, later bucket, suggestion
    // set (which lights up the Accept chip in the Week inbox).
    const fields = resolveInboxCreateFields(
      parseQuickInput("pay water bill; tomorrow", { ...ctx, today: ref })
    );
    expect(fields.scheduledDate).toBeNull();
    expect(fields.bucketOverride).toBe("later");
    expect(fields.suggestedScheduledDate).toBe("2026-07-09");
  });
});
