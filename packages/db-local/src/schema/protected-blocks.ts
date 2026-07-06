import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { PROJECT_CATEGORIES } from "./projects";
import { protectedBlockTemplates } from "./protected-block-templates";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const protectedBlockStatusValues = ["proposed", "confirmed"] as const;

export const protectedBlocks = sqliteTable(
  "protected_blocks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    category: text("category", { enum: PROJECT_CATEGORIES }).notNull(),
    scheduledDate: text("scheduled_date").notNull(),
    label: text("label"),
    startMin: integer("start_min"),
    endMin: integer("end_min"),
    templateId: text("template_id").references(() => protectedBlockTemplates.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: protectedBlockStatusValues }).notNull().default("confirmed"),
    source: text("source"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    index("protected_blocks_user_id_scheduled_date_idx").on(table.userId, table.scheduledDate),
    index("protected_blocks_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
