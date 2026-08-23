import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import * as schema from "./schema";
import {
  GLOBAL_TABLES,
  ORG_INFRA_TABLES,
  TABLE_VISIBILITY,
  VISIBILITY_CLASSES,
  allSchemaTableNames,
  isPgTable,
  tablesInClass,
} from "./tenancy";

const UNCLASSIFIED: readonly string[] = [...GLOBAL_TABLES, ...ORG_INFRA_TABLES];

/**
 * Scans `src/db/schema/*.ts` directly rather than reading the barrel. A table
 * omitted from `schema/index.ts` still exists in Postgres and still holds user
 * rows — `task_dependencies` was in exactly that state — so trusting the barrel
 * would let a table escape classification silently.
 */
const SCHEMA_DIR = join(__dirname, "schema");

/** Matches `pgTable("name"` across both the single-line and formatted forms. */
const PG_TABLE_DECLARATION = /pgTable\(\s*"([a-z_]+)"/g;

function declaredTableNames(): string[] {
  const files = readdirSync(SCHEMA_DIR).filter(
    (file) => file.endsWith(".ts") && !file.endsWith(".test.ts") && file !== "index.ts"
  );

  const names = new Set<string>();
  for (const file of files) {
    const source = readFileSync(join(SCHEMA_DIR, file), "utf8");
    PG_TABLE_DECLARATION.lastIndex = 0;
    let match = PG_TABLE_DECLARATION.exec(source);
    while (match !== null) {
      names.add(match[1]);
      match = PG_TABLE_DECLARATION.exec(source);
    }
  }
  return Array.from(names).sort();
}

describe("tenancy classification", () => {
  const onDisk = declaredTableNames();

  it("classifies every table defined under src/db/schema", () => {
    const missing = onDisk
      .filter((name) => !UNCLASSIFIED.includes(name))
      .filter((name) => !(name in TABLE_VISIBILITY))
      .sort();

    // If this fails you added a table without deciding who can see it. Add it to
    // TABLE_VISIBILITY in src/db/tenancy.ts — PERSONAL if you are unsure.
    expect(missing).toEqual([]);
  });

  it("re-exports every schema table from the barrel", () => {
    const barrel = new Set(allSchemaTableNames());
    const unexported = onDisk.filter((name) => !barrel.has(name)).sort();

    // Drizzle's relational query builder only sees tables in the barrel.
    expect(unexported).toEqual([]);
  });

  it("has no stale entries pointing at tables that no longer exist", () => {
    const actual = new Set(onDisk);
    const stale = Object.keys(TABLE_VISIBILITY)
      .filter((name) => !actual.has(name))
      .sort();

    expect(stale).toEqual([]);
  });

  it("never classifies a global or infra table", () => {
    const overlap = UNCLASSIFIED.filter((name) => name in TABLE_VISIBILITY).sort();

    expect(overlap).toEqual([]);
  });

  it("assigns each table exactly one known visibility class", () => {
    for (const [table, visibility] of Object.entries(TABLE_VISIBILITY)) {
      expect(VISIBILITY_CLASSES, `${table} has an unknown visibility class`).toContain(visibility);
    }
  });
});

describe("financial data placement", () => {
  // Money lives in its own FINANCIAL-class tables, never as a column on a table a
  // Member can read. Enforcing that here is what makes column-level security
  // unnecessary: a Member's `SELECT *` cannot leak a rate that is not in the row.
  //
  // `currency` is deliberately NOT in this list. It is an ISO denomination code
  // (USD/GBP), not an amount — a Member seeing "this client bills in GBP" leaks
  // nothing, and `clients.currency` (org_shared) is required by the W1 spec. The
  // guard is about amounts (rate, revenue, price, salary) and billable state.
  const MONEY_COLUMN = /(^|_)(rate|rates|revenue|invoice|price|salary|billable)(_|$)/;

  const tenantTables = (Object.values(schema) as unknown[])
    .filter(isPgTable)
    .filter((table) => getTableName(table) in TABLE_VISIBILITY);

  it("keeps money columns off personal and org-shared tables", () => {
    const offenders: string[] = [];

    for (const table of tenantTables) {
      const tableName = getTableName(table);
      if (TABLE_VISIBILITY[tableName] === "financial") continue;

      for (const column of Object.values(getTableColumns(table))) {
        if (MONEY_COLUMN.test(column.name)) {
          offenders.push(`${tableName}.${column.name}`);
        }
      }
    }

    // If this fails: do not add the column here and do not reach for column-level
    // grants. Put it on a new table classified "financial" in src/db/tenancy.ts.
    expect(offenders).toEqual([]);
  });

  it("keeps `rates` — and only rates — in the financial class", () => {
    // The first (and, in W1, only) financial table. This replaces the original
    // "starts with no financial tables" assertion, which existed to prove the
    // empty class was deliberate. Update the expected list as financial tables land.
    expect(tablesInClass("financial")).toEqual(["rates"]);
  });
});
