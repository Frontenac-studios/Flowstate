/* eslint-disable @typescript-eslint/no-require-imports */
const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

config({ path: ".env" });
config({ path: ".env.local", override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

async function main() {
  const migrationPath = path.join(__dirname, "../drizzle/0001_low_supreme_intelligence.sql");
  const raw = fs.readFileSync(migrationPath, "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    try {
      await sql.unsafe(statement);
      console.log("OK:", statement.slice(0, 60).replace(/\s+/g, " ") + "...");
    } catch (err) {
      if (err.code === "42P07") {
        console.log("SKIP (exists):", statement.slice(0, 40));
        continue;
      }
      throw err;
    }
  }

  const rlsPath = path.join(__dirname, "../supabase/rls/20260525120000_kash_schema_rls.sql");
  const rlsRaw = fs.readFileSync(rlsPath, "utf8");
  const rlsStatements = rlsRaw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const statement of rlsStatements) {
    try {
      await sql.unsafe(statement);
      console.log("RLS OK:", statement.slice(0, 50).replace(/\s+/g, " "));
    } catch (err) {
      if (err.code === "42710") {
        console.log("RLS SKIP (exists):", statement.slice(0, 40));
        continue;
      }
      throw err;
    }
  }

  await sql`SELECT 1`;
  console.log("Migration + RLS applied successfully.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
