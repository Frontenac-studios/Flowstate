/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Applies Drizzle SQL migrations in order (for CI/local E2E when drizzle-kit migrate hangs).
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

async function runMigrationFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    try {
      await sql.unsafe(statement);
    } catch (err) {
      if (err.code === "42P07" || err.code === "42701" || err.code === "42710") {
        console.log("SKIP:", path.basename(filePath), err.code, statement.slice(0, 40));
        continue;
      }
      console.error("FAIL:", path.basename(filePath), err.code, err.message);
      throw err;
    }
  }
  console.log("OK:", path.basename(filePath));
}

async function main() {
  const dir = path.join(__dirname, "../drizzle");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    await runMigrationFile(path.join(dir, file));
  }

  console.log("Drizzle migrations applied.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
