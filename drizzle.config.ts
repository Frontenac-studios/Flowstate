import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Drizzle Kit runs outside Next.js and does not load .env.local automatically.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (see .env.example).\n" +
      "Hosted: Supabase dashboard → Connect → Transaction pooler URI; replace [YOUR-PASSWORD] with your database password (Settings → Database).\n" +
      "Local: run ./scripts/setup.sh with Supabase, or copy DB_URL from `npm run supabase -- status -o env` into DATABASE_URL."
  );
}

export default defineConfig({
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
