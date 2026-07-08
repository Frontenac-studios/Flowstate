import { randomUUID } from "node:crypto";

import { createSqliteDb } from "@kash/db-local";
import { appSettings, chatMessages, tasks } from "@kash/db-local/schema";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("desktop sqlite inserts", () => {
  const userId = randomUUID();
  let db: ReturnType<typeof createSqliteDb>["db"];

  beforeEach(() => {
    vi.stubEnv("DATABASE_MODE", "sqlite");
    db = createSqliteDb(":memory:").db;
  });

  it("creates app_settings without explicit timestamps", () => {
    const row = db.insert(appSettings).values({ userId, bucketMode: "relative" }).returning().get();

    expect(row.userId).toBe(userId);
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
  });

  it("creates tasks without explicit id or timestamps", () => {
    const row = db
      .insert(tasks)
      .values({
        userId,
        title: "Call mom",
        category: "relationships",
        tags: null,
      })
      .returning()
      .get();

    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(row.title).toBe("Call mom");
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it("writes and reads back object chat content (jsonb mirror)", () => {
    const content = { type: "text", text: "hello", meta: { source: "nudge" } };
    const inserted = db
      .insert(chatMessages)
      .values({ userId, threadId: "global", role: "user", content })
      .returning()
      .get();

    expect(inserted.content).toEqual(content);

    const read = db.select().from(chatMessages).where(eq(chatMessages.id, inserted.id)).get();
    expect(read?.content).toEqual(content);
  });

  it("creates an inbox task carrying a suggested scheduled date", () => {
    const row = db
      .insert(tasks)
      .values({
        userId,
        title: "Ship the deck",
        category: "professional",
        scheduledDate: null,
        bucketOverride: "later",
        suggestedScheduledDate: "2026-07-10",
      })
      .returning()
      .get();

    expect(row.scheduledDate).toBeNull();
    expect(row.bucketOverride).toBe("later");
    expect(row.suggestedScheduledDate).toBe("2026-07-10");

    const read = db.select().from(tasks).where(eq(tasks.id, row.id)).get();
    expect(read?.suggestedScheduledDate).toBe("2026-07-10");
  });

  it("upserts lastUsedCategory via onConflictDoUpdate", () => {
    db.insert(appSettings)
      .values({ userId, lastUsedCategory: "professional" })
      .onConflictDoUpdate({
        target: appSettings.userId,
        set: { lastUsedCategory: "professional", updatedAt: new Date() },
      })
      .run();

    const row = db.select().from(appSettings).where(eq(appSettings.userId, userId)).get();
    expect(row?.lastUsedCategory).toBe("professional");
  });
});
