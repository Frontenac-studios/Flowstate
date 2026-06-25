import type { SqliteDb } from "@kash/db-local";
import {
  appSettings,
  categorySettings,
  chatMessages,
  dayReviews,
  nudgeEvents,
  phases,
  projects,
  protectedBlockTemplates,
  protectedBlocks,
  syncWatermarks,
  taskBulkImportItems,
  taskBulkImports,
  taskDependencies,
  taskOccurrenceOverrides,
  taskRecurrence,
  taskTimeEntries,
  tasks,
} from "@kash/db-local/schema";
import type { SupabaseClient } from "@supabase/supabase-js";
import { and, eq } from "drizzle-orm";

import { coalesceMutations } from "./coalesce-mutations";
import { pickNewerRow } from "./conflict";
import { listPendingMutations, markMutationsSynced } from "./mutation-log";
import { mapPayloadToRemote, mapRemoteRow } from "./row-mapper";
import { SYNC_TABLES, type SyncTable } from "./tables";

/** Max rows fetched per pull page. Bounds payload size and kills the old full-table re-pull. */
const PULL_PAGE_SIZE = 500;

/**
 * Secondary sort column for keyset-ordered pull paging, by table. Most tables key on
 * `id`; the composite-PK tables order by a PK member instead (they have no `id`).
 */
const PULL_TIEBREAK: Partial<Record<SyncTable, string>> = {
  category_settings: "category",
  task_bulk_import_items: "task_id",
};

/** Tables whose remote rows are not addressable by a single `id` column (composite PK). */
const NON_ID_DELETE_TABLES = new Set<SyncTable>([
  "app_settings",
  "category_settings",
  "task_bulk_import_items",
]);

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

  const pull = await pullRemoteChanges(params);
  result.pulled = pull.count;
  result.errors.push(...pull.errors);

  const push = await pushPendingMutations(params);
  result.pushed = push.count;
  result.errors.push(...push.errors);

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
}): Promise<{ count: number; errors: string[] }> {
  let count = 0;
  const errors: string[] = [];
  const now = new Date();

  for (const table of SYNC_TABLES) {
    try {
      // app_settings is a single row per user — no watermark filter, no paging.
      if (table === "app_settings") {
        const { data, error } = await params.supabase
          .from(table)
          .select("*")
          .eq("user_id", params.userId);
        if (error) throw error;
        count += await applyRemoteRows(params.db, table, data ?? []);
        await setWatermark(params.db, table, now);
        continue;
      }

      const since = await getWatermark(params.db, table);
      const tiebreak = PULL_TIEBREAK[table] ?? "id";

      // Page through changes since the watermark over a stable (updated_at, tiebreak)
      // order, draining every page. A failure aborts THIS table only (watermark left
      // intact so the next sync resumes) — never a full-table re-pull.
      for (let from = 0; ; from += PULL_PAGE_SIZE) {
        const { data, error } = await params.supabase
          .from(table)
          .select("*")
          .eq("user_id", params.userId)
          .gte("updated_at", since.toISOString())
          .order("updated_at", { ascending: true })
          .order(tiebreak, { ascending: true })
          .range(from, from + PULL_PAGE_SIZE - 1);
        if (error) throw error;

        const rows = data ?? [];
        count += await applyRemoteRows(params.db, table, rows);
        if (rows.length < PULL_PAGE_SIZE) break;
      }

      // Only advance the watermark once the table has fully drained without error.
      await setWatermark(params.db, table, now);
    } catch (e) {
      errors.push(`pull ${table}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { count, errors };
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
    case "phases": {
      const id = mapped.id as string;
      const [existing] = await db.select().from(phases).where(eq(phases.id, id)).limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(phases)
          .set(mapped as never)
          .where(eq(phases.id, id));
      else await db.insert(phases).values(mapped as never);
      return true;
    }
    case "task_dependencies": {
      const id = mapped.id as string;
      const [existing] = await db
        .select()
        .from(taskDependencies)
        .where(eq(taskDependencies.id, id))
        .limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(taskDependencies)
          .set(mapped as never)
          .where(eq(taskDependencies.id, id));
      else await db.insert(taskDependencies).values(mapped as never);
      return true;
    }
    case "task_recurrence": {
      const id = mapped.id as string;
      const [existing] = await db
        .select()
        .from(taskRecurrence)
        .where(eq(taskRecurrence.id, id))
        .limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(taskRecurrence)
          .set(mapped as never)
          .where(eq(taskRecurrence.id, id));
      else await db.insert(taskRecurrence).values(mapped as never);
      return true;
    }
    case "task_occurrence_overrides": {
      const id = mapped.id as string;
      const [existing] = await db
        .select()
        .from(taskOccurrenceOverrides)
        .where(eq(taskOccurrenceOverrides.id, id))
        .limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(taskOccurrenceOverrides)
          .set(mapped as never)
          .where(eq(taskOccurrenceOverrides.id, id));
      else await db.insert(taskOccurrenceOverrides).values(mapped as never);
      return true;
    }
    case "protected_block_templates": {
      const id = mapped.id as string;
      const [existing] = await db
        .select()
        .from(protectedBlockTemplates)
        .where(eq(protectedBlockTemplates.id, id))
        .limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(protectedBlockTemplates)
          .set(mapped as never)
          .where(eq(protectedBlockTemplates.id, id));
      else await db.insert(protectedBlockTemplates).values(mapped as never);
      return true;
    }
    case "protected_blocks": {
      const id = mapped.id as string;
      const [existing] = await db
        .select()
        .from(protectedBlocks)
        .where(eq(protectedBlocks.id, id))
        .limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(protectedBlocks)
          .set(mapped as never)
          .where(eq(protectedBlocks.id, id));
      else await db.insert(protectedBlocks).values(mapped as never);
      return true;
    }
    case "category_settings": {
      const userId = mapped.userId as string;
      const category = mapped.category as string;
      const [existing] = await db
        .select()
        .from(categorySettings)
        .where(
          and(eq(categorySettings.userId, userId), eq(categorySettings.category, category as never))
        )
        .limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(categorySettings)
          .set(mapped as never)
          .where(
            and(
              eq(categorySettings.userId, userId),
              eq(categorySettings.category, category as never)
            )
          );
      else await db.insert(categorySettings).values(mapped as never);
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
    case "task_bulk_imports": {
      const id = mapped.id as string;
      const [existing] = await db
        .select()
        .from(taskBulkImports)
        .where(eq(taskBulkImports.id, id))
        .limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(taskBulkImports)
          .set(mapped as never)
          .where(eq(taskBulkImports.id, id));
      else await db.insert(taskBulkImports).values(mapped as never);
      return true;
    }
    case "task_bulk_import_items": {
      const importId = mapped.importId as string;
      const taskId = mapped.taskId as string;
      const [existing] = await db
        .select()
        .from(taskBulkImportItems)
        .where(
          and(eq(taskBulkImportItems.importId, importId), eq(taskBulkImportItems.taskId, taskId))
        )
        .limit(1);
      if (existing && pickNewerRow(existing, mapped as typeof existing) === "local") return false;
      if (existing)
        await db
          .update(taskBulkImportItems)
          .set(mapped as never)
          .where(
            and(eq(taskBulkImportItems.importId, importId), eq(taskBulkImportItems.taskId, taskId))
          );
      else await db.insert(taskBulkImportItems).values(mapped as never);
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
}): Promise<{ count: number; errors: string[] }> {
  const pending = await listPendingMutations(params.db);
  const coalesced = coalesceMutations(pending);
  let count = 0;
  const errors: string[] = [];

  // Group the last-write-per-row units by table so each table flushes in one or two
  // network calls (a batched upsert + a batched delete) instead of one call per mutation.
  const byTable = new Map<SyncTable, typeof coalesced>();
  for (const unit of coalesced) {
    const list = byTable.get(unit.table);
    if (list) list.push(unit);
    else byTable.set(unit.table, [unit]);
  }

  for (const [table, units] of Array.from(byTable.entries())) {
    const upserts = units.filter((u) => u.op === "upsert");
    const deletes = units.filter((u) => u.op === "delete");

    try {
      if (upserts.length > 0) {
        // insert and update are equivalent here — the outbox payload is the full row,
        // so a single batched upsert (keyed on the table PK) covers both.
        const rows = upserts.map((u) =>
          mapPayloadToRemote(table, u.payload as Record<string, unknown>)
        );
        const { error } = await params.supabase.from(table).upsert(rows);
        if (error) throw error;
        await markMutationsSynced(
          params.db,
          upserts.flatMap((u) => u.mutationIds)
        );
        count += upserts.length;
      }

      if (deletes.length > 0) {
        if (NON_ID_DELETE_TABLES.has(table)) {
          // Composite-PK tables have no single `id` to batch on — delete per row.
          for (const unit of deletes) {
            const { error } = await params.supabase
              .from(table)
              .delete()
              .eq("id", unit.rowId)
              .eq("user_id", params.userId);
            if (error) throw error;
            await markMutationsSynced(params.db, unit.mutationIds);
            count += 1;
          }
        } else {
          const { error } = await params.supabase
            .from(table)
            .delete()
            .in(
              "id",
              deletes.map((u) => u.rowId)
            )
            .eq("user_id", params.userId);
          if (error) throw error;
          await markMutationsSynced(
            params.db,
            deletes.flatMap((u) => u.mutationIds)
          );
          count += deletes.length;
        }
      }
    } catch (e) {
      // Leave this table's mutations pending; the next sync retries. Other tables proceed.
      errors.push(`push ${table}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { count, errors };
}
