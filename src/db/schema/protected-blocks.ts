import { date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { projectCategory } from "./projects";
import { protectedBlockTemplates } from "./protected-block-templates";

export const protectedBlockStatus = pgEnum("protected_block_status", ["proposed", "confirmed"]);

/** A spoken-for slice of a day for a life category (Week §7 protected blocks). */
export const protectedBlocks = pgTable(
  "protected_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    category: projectCategory("category").notNull(),
    scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
    label: text("label"),
    startMin: integer("start_min"),
    endMin: integer("end_min"),
    templateId: uuid("template_id").references(() => protectedBlockTemplates.id, {
      onDelete: "set null",
    }),
    status: protectedBlockStatus("status").notNull().default("confirmed"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("protected_blocks_user_id_scheduled_date_idx").on(table.userId, table.scheduledDate),
    index("protected_blocks_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
