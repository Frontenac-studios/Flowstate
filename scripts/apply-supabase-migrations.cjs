/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Applies SQL files in supabase/rls/ (RLS, incremental patches).
 * Run after Drizzle migrations when bootstrapping local/CI databases.
 * Kept out of supabase/migrations so `supabase start` does not apply RLS before tables exist.
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
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

async function runFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return;

  try {
    await sql.unsafe(raw);
    console.log("OK:", path.basename(filePath));
  } catch (err) {
    if (err.code === "42710" || err.code === "42P07" || err.code === "42701") {
      console.log("SKIP (exists):", path.basename(filePath));
      return;
    }
    throw err;
  }
}

async function main() {
  const dir = path.join(__dirname, "../supabase/rls");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    await runFile(path.join(dir, file));
  }

  console.log("Supabase migrations applied.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
