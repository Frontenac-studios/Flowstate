import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { BINGO_CARD_STATUS } from "./planning-enums";
import { sqliteNow, sqliteRowId } from "../sqlite-defaults";

export const bingoCards = sqliteTable(
  "bingo_cards",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => sqliteRowId()),
    userId: text("user_id").notNull(),
    cardYear: integer("card_year").notNull(),
    status: text("status", { enum: BINGO_CARD_STATUS }).notNull().default("draft"),
    finalizedAt: integer("finalized_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => sqliteNow()),
  },
  (table) => [
    uniqueIndex("bingo_cards_user_id_card_year_idx").on(table.userId, table.cardYear),
    index("bingo_cards_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ]
);
