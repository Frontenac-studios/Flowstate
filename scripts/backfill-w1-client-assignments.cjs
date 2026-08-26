/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * W1 one-time data-tidy — satisfy the acceptance criterion in docs/v1-scope.md:
 * "Existing project rows all carry a client or are explicitly marked
 *  internal/personal after migration — verified by a count query returning 0
 *  unassigned."
 *
 * After the W1 migration the `clients` table was empty, so three business
 * projects were left client-less (count query returned 3, not 0). This pass
 * creates the three clients and links each project, plus the two known default
 * rates (Great White $45/hr, Hume $30/hr — Frontenac's rate was unknown and is
 * left unset).
 *
 * APPLIED to hosted prod (xaujjkbgejozhcjehmul) on 2026-08-26; committed for
 * provenance. It is idempotent — re-running inserts nothing new and re-assigns
 * nothing already set — so it is safe to run again against any environment that
 * still has unassigned rows.
 *
 * Runs as a single atomic transaction that commits ONLY if the criterion (0
 * unassigned business projects) holds afterward; otherwise it throws and the
 * whole transaction rolls back. NOT the statement-at-a-time apply-drizzle path.
 *
 * Usage:
 *   node scripts/backfill-w1-client-assignments.cjs            # apply
 *   node scripts/backfill-w1-client-assignments.cjs --dry-run  # report only, no writes
 *
 * DATABASE_URL is read from .env then .env.local (override), same as
 * drizzle.config.ts / scripts/check-database.cjs. Point it at the environment you
 * intend to change and confirm the target before running.
 */
const { config } = require("dotenv");
const postgres = require("postgres");

config({ path: `${process.cwd()}/.env` });
config({ path: `${process.cwd()}/.env.local`, override: true });

const DRY_RUN = process.argv.includes("--dry-run");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (see README Supabase section).");
  process.exit(1);
}

// Owner of the rows being tidied. This is the RLS owner — clients/rates carry
// user_id and are only visible when user_id = auth.uid(), so it must match the
// user that owns the projects. Verified against hosted: katg924@gmail.com.
const OWNER = "2ba8606a-ee74-4f33-b52d-8ebf04bda9cd";
// org_id on clients/rates is NOT NULL but has no FK and no RLS check; reuse the
// existing "Personal" org for tidiness.
const ORG = "b16cfe53-74c9-4d58-96a3-8a9f41dd3a3b";

// project slug → client name
const ASSIGNMENTS = [
  ["great-white-client-build", "Great White"],
  ["hume-ops-system", "Hume"],
  ["frontenac-studios-launch", "Frontenac Studios"],
];
// client name → default rate in integer cents/hour (client-scoped, project_id null)
const RATES = [
  ["Great White", 4500], // $45.00/hr
  ["Hume", 3000], // $30.00/hr
  // Frontenac Studios: rate unknown at backfill time — intentionally unset.
];

const sql = postgres(url, { prepare: false, connect_timeout: 15, max: 1 });

const countUnassigned = (conn) => conn`
  select count(*)::int as n from projects
  where category = 'business' and client_id is null and is_maintenance = false
`;

(async () => {
  try {
    const [{ n: before }] = await countUnassigned(sql);
    console.log(`Unassigned business projects before: ${before}`);

    if (DRY_RUN) {
      const rows = await sql`
        select slug, name from projects
        where category = 'business' and client_id is null and is_maintenance = false
        order by created_at`;
      console.log("Would create clients:", ASSIGNMENTS.map(([, c]) => c).join(", "));
      console.log("Would assign:", JSON.stringify(rows, null, 2));
      await sql.end({ timeout: 3 });
      return;
    }

    await sql.begin(async (tx) => {
      await tx`
        insert into clients (user_id, org_id, name, currency, billing_threshold_hours, status)
        select ${OWNER}::uuid, ${ORG}::uuid, v.name, 'USD', 20, 'active'
        from (values ${sql(ASSIGNMENTS.map(([, name]) => [name]))}) as v(name)
        where not exists (
          select 1 from clients c where c.user_id = ${OWNER}::uuid and c.name = v.name
        )`;

      for (const [slug, clientName] of ASSIGNMENTS) {
        await tx`
          update projects p
          set client_id = c.id, updated_at = now()
          from clients c
          where p.user_id = ${OWNER}::uuid
            and p.slug = ${slug}
            and p.client_id is null
            and c.user_id = ${OWNER}::uuid and c.name = ${clientName}`;
      }

      await tx`
        insert into rates (user_id, org_id, client_id, project_id, amount_cents, effective_from)
        select c.user_id, ${ORG}::uuid, c.id, null, r.amount_cents::int, now()
        from clients c
        join (values ${sql(RATES)}) as r(name, amount_cents) on r.name = c.name
        where c.user_id = ${OWNER}::uuid
          and not exists (
            select 1 from rates rr where rr.client_id = c.id and rr.project_id is null
          )`;

      const [{ n: after }] = await countUnassigned(tx);
      if (after !== 0) {
        throw new Error(`Criterion NOT met (unassigned=${after}); rolling back.`);
      }
    });

    const [{ n: after }] = await countUnassigned(sql);
    console.log(`Unassigned business projects after: ${after} (committed)`);
    await sql.end({ timeout: 5 });
  } catch (err) {
    console.error("Backfill failed (rolled back):", err.message);
    try {
      await sql.end({ timeout: 3 });
    } catch {}
    process.exit(1);
  }
})();
