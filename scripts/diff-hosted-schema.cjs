/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Compares the live database against the Drizzle schema and exits non-zero on drift.
 *
 * WHY THIS EXISTS
 * `apply-drizzle-migrations.cjs` swallows "already exists" errors (42P07 / 42701 /
 * 42710) so migrations can be re-run safely. The cost is that a genuinely failed
 * statement looks identical to a redundant one in its output, and nothing ever
 * reconciles the result. That is how hosted ended up missing three `app_settings`
 * columns for weeks while its journal claimed the migrations had applied, silently
 * breaking `settings.get` in production.
 *
 * That script also never writes to `drizzle.__drizzle_migrations`, so the journal
 * cannot answer "what is actually applied?" either. This one asks the database.
 *
 * SOURCE OF TRUTH
 * The newest `drizzle/meta/*_snapshot.json`, which `npm run db:generate` produces
 * from `src/db/schema`. Reading the snapshot rather than the migration files is
 * deliberate: replaying migrations to work out the expected shape reproduces the
 * same blind spot this script exists to close. The snapshot is only as fresh as
 * the last `db:generate`, which the project already requires for schema changes.
 *
 * WHAT IT CHECKS
 * Tables and columns in both directions, plus per-column nullability and whether a
 * default exists. It does not compare default *expressions* or full type text —
 * Postgres normalises both, and the false positives would train you to ignore it.
 *
 * USAGE
 *   npm run db:diff-hosted
 *
 * It prints the host it is checking before doing anything, because DATABASE_URL in
 * .env.local moves between hosted and local Docker and knowing which one you just
 * verified is the entire point.
 */
const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

config({ path: ".env" });
if (!process.env.DATABASE_URL) {
  config({ path: ".env.local", override: true });
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

/** Host and database only — never print the credentials in the URL. */
function describeTarget(connectionString) {
  try {
    const parsed = new URL(connectionString);
    const db = parsed.pathname.replace(/^\//, "") || "postgres";
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(parsed.hostname);
    return `${parsed.hostname}:${parsed.port || 5432}/${db}${local ? "  (local)" : "  (REMOTE)"}`;
  } catch {
    return "unparseable DATABASE_URL";
  }
}

function latestSnapshot() {
  const dir = path.join(__dirname, "../drizzle/meta");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith("_snapshot.json"))
    .sort();
  if (files.length === 0) throw new Error("No Drizzle snapshot found in drizzle/meta.");
  const file = files[files.length - 1];
  return { file, snapshot: JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) };
}

/** Snapshot keys are "public.tasks"; information_schema gives "tasks". */
const bareName = (key) => key.split(".").pop();

async function main() {
  const { file, snapshot } = latestSnapshot();

  const expected = {};
  for (const [key, table] of Object.entries(snapshot.tables)) {
    const columns = {};
    for (const [name, col] of Object.entries(table.columns)) {
      columns[name] = { notNull: !!col.notNull, hasDefault: col.default !== undefined };
    }
    expected[bareName(key)] = columns;
  }

  console.log(`schema:   ${file}  (${Object.keys(expected).length} tables)`);
  console.log(`database: ${describeTarget(url)}`);

  const sql = postgres(url, { prepare: false, max: 1 });
  let rows;
  try {
    rows = await sql`
      select c.table_name, c.column_name, c.is_nullable, c.column_default
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
      where c.table_schema = 'public' and t.table_type = 'BASE TABLE'`;
  } finally {
    await sql.end();
  }

  const actual = {};
  for (const r of rows) {
    (actual[r.table_name] ??= {})[r.column_name] = {
      notNull: r.is_nullable === "NO",
      hasDefault: r.column_default !== null,
    };
  }

  // Tables Drizzle does not own. `__drizzle_migrations` lives in its own schema, so
  // anything here is genuinely extra — but flag rather than fail, since a hand-made
  // table is a decision, not necessarily a mistake.
  const IGNORED_TABLES = new Set([]);

  const drift = [];
  const notes = [];

  for (const [table, columns] of Object.entries(expected)) {
    if (!actual[table]) {
      drift.push(`MISSING TABLE    ${table}`);
      continue;
    }
    for (const [column, spec] of Object.entries(columns)) {
      const live = actual[table][column];
      if (!live) {
        drift.push(`MISSING COLUMN   ${table}.${column}${spec.notNull ? "  (NOT NULL)" : ""}`);
        continue;
      }
      if (spec.notNull !== live.notNull) {
        drift.push(
          `NULLABILITY      ${table}.${column}  schema=${spec.notNull ? "NOT NULL" : "NULL"} live=${live.notNull ? "NOT NULL" : "NULL"}`
        );
      }
      if (spec.hasDefault !== live.hasDefault) {
        drift.push(
          `DEFAULT          ${table}.${column}  schema=${spec.hasDefault ? "has" : "none"} live=${live.hasDefault ? "has" : "none"}`
        );
      }
    }
  }

  for (const [table, columns] of Object.entries(actual)) {
    if (IGNORED_TABLES.has(table)) continue;
    if (!expected[table]) {
      notes.push(`EXTRA TABLE      ${table}  (present live, absent from the schema)`);
      continue;
    }
    for (const column of Object.keys(columns)) {
      if (!expected[table][column]) {
        drift.push(`EXTRA COLUMN     ${table}.${column}  (present live, absent from the schema)`);
      }
    }
  }

  console.log("");
  if (notes.length) console.log(notes.sort().join("\n") + "\n");

  if (drift.length === 0) {
    console.log("No drift. The database matches the Drizzle schema.");
    return;
  }

  console.log(drift.sort().join("\n"));
  console.log(`\n${drift.length} difference${drift.length === 1 ? "" : "s"}.`);
  console.log(
    "Generate a migration with `npm run db:generate` and review the SQL, or repair the\n" +
      "database directly if a past migration was skipped. Do not edit a committed migration."
  );
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
