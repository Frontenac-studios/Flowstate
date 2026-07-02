import { date, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const EVIDENCE_EDITION_KINDS = ["periodic", "milestone"] as const;
export type EvidenceEditionKind = (typeof EVIDENCE_EDITION_KINDS)[number];

export const EVIDENCE_EDITION_STATES = ["unseen", "seen"] as const;
export type EvidenceEditionState = (typeof EVIDENCE_EDITION_STATES)[number];

export type EvidenceAnchor = {
  type: "win" | "reflection" | "milestone" | "goal";
  id: string;
  label: string;
};

export type EvidenceNarrative = {
  throughline: string;
  anchors: EvidenceAnchor[];
};

/** Cached Evidence edition — wins memory shrine (Gap A). */
export const evidenceEditions = pgTable(
  "evidence_editions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    kind: text("kind").notNull().$type<EvidenceEditionKind>(),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    refId: uuid("ref_id"),
    narrative: jsonb("narrative").$type<EvidenceNarrative>().notNull().default({
      throughline: "",
      anchors: [],
    }),
    state: text("state").notNull().$type<EvidenceEditionState>().default("unseen"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("evidence_editions_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("evidence_editions_user_kind_period_idx").on(table.userId, table.kind, table.periodStart),
  ]
);
