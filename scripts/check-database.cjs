#!/usr/bin/env node
/**
 * Verifies DATABASE_URL from .env.local (same loading as drizzle.config.ts).
 * Usage: npm run db:check
 */
const { config } = require("dotenv");
const postgres = require("postgres");

config({ path: ".env" });
config({ path: ".env.local", override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Copy .env.example → .env.local and fill it in (see README Supabase section)."
  );
  process.exit(1);
}

const sql = postgres(url, { prepare: false, connect_timeout: 10 });

sql`select 1 as ok`
  .then(() => {
    console.log("Database connection OK");
    return sql.end({ timeout: 2 });
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    if (url.includes("@db.") && String(err.message).includes("ENOTFOUND")) {
      console.error(
        "Hint: the direct db.<ref>.supabase.co host may not resolve. Use the Transaction pooler URI from Supabase → Connect (port 6543)."
      );
    }
    if (String(err.message).includes("Tenant or user not found")) {
      console.error(
        "Hint: wrong pooler region or username. Copy the full URI from Supabase → Connect without editing the host."
      );
    }
    if (String(err.message).includes("password authentication failed")) {
      console.error(
        "Hint: reset the database password under Settings → Database and update DATABASE_URL."
      );
    }
    process.exit(1);
  });
