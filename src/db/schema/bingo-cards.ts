import { index, integer, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { bingoCardStatus } from "./planning-enums";

/** One annual bingo card per user per calendar year (§7.2). */
export const bingoCards = pgTable(
  "bingo_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    cardYear: integer("card_year").notNull(),
    status: bingoCardStatus("status").notNull().default("draft"),
    finalizedAt: timestamp("finalized_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bingo_cards_user_id_card_year_idx").on(table.userId, table.cardYear),
    index("bingo_cards_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
