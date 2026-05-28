import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const syncMutations = sqliteTable(
  "sync_mutations",
  {
    id: text("id").primaryKey(),
    tableName: text("table_name").notNull(),
    rowId: text("row_id").notNull(),
    op: text("op").notNull(),
    payloadJson: text("payload_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    syncedAt: integer("synced_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("sync_mutations_synced_at_idx").on(table.syncedAt)]
);

export const syncWatermarks = sqliteTable("sync_watermarks", {
  tableName: text("table_name").primaryKey(),
  pulledAt: integer("pulled_at", { mode: "timestamp_ms" }).notNull(),
});
