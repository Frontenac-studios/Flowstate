import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import type { ProjectTemplateStructure } from "@/lib/projects/template-structure";

import { projectCategory } from "./projects";

export const projectTemplates = pgTable(
  "project_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    category: projectCategory("category").notNull(),
    structure: jsonb("structure").$type<ProjectTemplateStructure>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("project_templates_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("project_templates_user_id_name_idx").on(table.userId, table.name),
  ]
);
