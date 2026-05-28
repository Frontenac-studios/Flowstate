import type { SqliteDb } from "@kash/db-local";
import {
  appSettings,
  chatMessages,
  dayReviews,
  nudgeEvents,
  projects,
  syncWatermarks,
  taskTimeEntries,
  tasks,
} from "@kash/db-local/schema";
import type { SupabaseClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";

import { pickNewerRow } from "./conflict";
import { listPendingMutations, markMutationSynced } from "./mutation-log";
import { mapPayloadToRemote, mapRemoteRow } from "./row-mapper";
import { SYNC_TABLES, type SyncTable } from "./tables";

type SyncResult = {
  pulled: number;
  pushed: number;
  errors: string[];
};

export async function runSync(params: {
  db: SqliteDb;
  supabase: SupabaseClient;
  userId: string;
}): Promise<SyncResult> {
  const result: SyncResult = { pulled: 0, pushed: 0, errors: [] };

  try {
    result.pulled = await pullRemoteChanges(params);
  } catch (e) {
    result.errors.push(`pull: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    result.pushed = await pushPendingMutations(params);
  } catch (e) {
    result.errors.push(`push: ${e instanceof Error ? e.message : String(e)}`);
  }

  return result;
}

async function getWatermark(db: SqliteDb, table: SyncTable): Promise<Date> {
  const [row] = await db
    .select()
    .from(syncWatermarks)
    .where(eq(syncWatermarks.tableName, table))
    .limit(1);
  return row?.pulledAt ?? new Date(0);
}

async function setWatermark(db: SqliteDb, table: SyncTable, at: Date): Promise<void> {
  const existing = await db
    .select()
    .from(syncWatermarks)
    .where(eq(syncWatermarks.tableName, table))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(syncWatermarks).values({ tableName: table, pulledAt: at });
  } else {
    await db
      .update(syncWatermarks)
      .set({ pulledAt: at })
      .where(eq(syncWatermarks.tableName, table));
  }
}

async function pullRemoteChanges(params: {
  db: SqliteDb;
  supabase: SupabaseClient;
  userId: string;
}): Promise<number> {
  let count = 0;
  const now = new Date();

  for (const table of SYNC_TABLES) {
    const since = await getWatermark(params.db, table);
    let query = params.supabase.from(table).select("*");

    if (table === "app_settings") {
      query = query.eq("user_id", params.userId);
    } else {
      query = query.eq("user_id", params.userId).gte("updated_at", since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      const fallback = await params.supabase.from(table).select("*").eq("user_id", params.userId);
      if (fallback.error) throw fallback.error;
      count += await applyRemoteRows(params.db, table, fallback.data ?? []);
    } else {
      count += await applyRemoteRows(params.db, table, data ?? []);
    }

    await setWatermark(params.db, table, now);
  }

  return count;
}

async function upsertRow(
  db: SqliteDb,
  table: SyncTable,
  mapped: Record<string, unknown>
): Promise<boolean> {
  switch (table) {
    case "projects": {
      const id = mapped.id as string;
      const [existing] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(projects)
          .set(mapped as never)
          .where(eq(projects.id, id));
      else await db.insert(projects).values(mapped as never);
      return true;
    }
    case "tasks": {
      const id = mapped.id as string;
      const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(tasks)
          .set(mapped as never)
          .where(eq(tasks.id, id));
      else await db.insert(tasks).values(mapped as never);
      return true;
    }
    case "task_time_entries": {
      const id = mapped.id as string;
      const [existing] = await db
        .select()
        .from(taskTimeEntries)
        .where(eq(taskTimeEntries.id, id))
        .limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(taskTimeEntries)
          .set(mapped as never)
          .where(eq(taskTimeEntries.id, id));
      else await db.insert(taskTimeEntries).values(mapped as never);
      return true;
    }
    case "chat_messages": {
      const id = mapped.id as string;
      const [existing] = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, id))
        .limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(chatMessages)
          .set(mapped as never)
          .where(eq(chatMessages.id, id));
      else await db.insert(chatMessages).values(mapped as never);
      return true;
    }
    case "day_reviews": {
      const id = mapped.id as string;
      const [existing] = await db.select().from(dayReviews).where(eq(dayReviews.id, id)).limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(dayReviews)
          .set(mapped as never)
          .where(eq(dayReviews.id, id));
      else await db.insert(dayReviews).values(mapped as never);
      return true;
    }
    case "app_settings": {
      const userId = mapped.userId as string;
      const [existing] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.userId, userId))
        .limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(appSettings)
          .set(mapped as never)
          .where(eq(appSettings.userId, userId));
      else await db.insert(appSettings).values(mapped as never);
      return true;
    }
    case "nudge_events": {
      const id = mapped.id as string;
      const [existing] = await db.select().from(nudgeEvents).where(eq(nudgeEvents.id, id)).limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(nudgeEvents)
          .set(mapped as never)
          .where(eq(nudgeEvents.id, id));
      else await db.insert(nudgeEvents).values(mapped as never);
      return true;
    }
    default:
      return false;
  }
}

async function applyRemoteRows(
  db: SqliteDb,
  table: SyncTable,
  rows: Record<string, unknown>[]
): Promise<number> {
  let applied = 0;
  for (const remote of rows) {
    const mapped = mapRemoteRow(table, remote);
    if (await upsertRow(db, table, mapped)) applied++;
  }
  return applied;
}

async function pushPendingMutations(params: {
  db: SqliteDb;
  supabase: SupabaseClient;
  userId: string;
}): Promise<number> {
  const pending = await listPendingMutations(params.db);
  let pushed = 0;

  for (const mutation of pending) {
    const table = mutation.tableName as SyncTable;
    const payload = JSON.parse(mutation.payloadJson) as Record<string, unknown>;
    const remotePayload = mapPayloadToRemote(table, payload);

    if (mutation.op === "delete") {
      const { error } = await params.supabase
        .from(table)
        .delete()
        .eq("id", mutation.rowId)
        .eq("user_id", params.userId);
      if (error) throw error;
    } else if (mutation.op === "insert") {
      const { error } = await params.supabase.from(table).upsert(remotePayload);
      if (error) throw error;
    } else {
      const { error } = await params.supabase
        .from(table)
        .update(remotePayload)
        .eq("id", mutation.rowId)
        .eq("user_id", params.userId);
      if (error) throw error;
    }

    await markMutationSynced(params.db, mutation.id);
    pushed++;
  }

  return pushed;
}
