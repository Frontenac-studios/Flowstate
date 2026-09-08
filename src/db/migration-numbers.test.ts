import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guards against two migrations sharing the same numeric prefix.
 *
 * `drizzle-kit generate` derives the next number from `drizzle/meta/_journal.json`,
 * but the journal has been frozen at 0051 since we moved to hand-numbered SQL
 * applied by `scripts/apply-drizzle-migrations.cjs` (which globs + lexicographically
 * sorts the folder, skipping already-applied DDL). With generate no longer handing
 * out numbers, two branches in flight at once both reach for the same next prefix
 * and collide on merge — which is exactly how 0059 and 0060 ended up doubled.
 *
 * A collision is not immediately fatal (the apply script's sort is deterministic and
 * the paired migrations were independent), but the ordering is then decided by the
 * slug alphabetising after the number, which is silent and fragile. This test makes
 * the next collision fail at PR time instead.
 *
 * KNOWN_DUPLICATES grandfathers the prefixes already doubled in committed history.
 * We do NOT renumber them: CLAUDE.md forbids editing a committed migration, and the
 * filenames are the unit the apply path tracks. The set is exact — resolve a new
 * collision by giving the not-yet-merged migration the next free number, never by
 * adding to this list.
 */
const MIGRATIONS_DIR = join(__dirname, "..", "..", "drizzle");

const KNOWN_DUPLICATES: ReadonlySet<string> = new Set([
  "0009", // 0009_chat_custom_suggestions + 0009_free_mulholland_black
  "0010", // 0010_delete_untitled_tasks + 0010_rename_health_wellness_to_body_mind
  "0059", // 0059_orgs_personal_for_user_id + 0059_pipeline_stages (W10f)
  "0060", // 0060_kill_care + 0060_lead_research (W10h)
]);

function migrationsByNumber(): Map<string, string[]> {
  const byNumber = new Map<string, string[]>();
  const files = readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(".sql"));

  for (const file of files) {
    const match = /^(\d{4})_/.exec(file);
    // A .sql file without the NNNN_ prefix is not a generated migration; ignore it
    // rather than crash, so a stray file never masquerades as a numbering failure.
    if (!match) continue;
    const [, number] = match;
    const group = byNumber.get(number) ?? [];
    group.push(file);
    byNumber.set(number, group);
  }

  return byNumber;
}

describe("migration numbering", () => {
  const byNumber = migrationsByNumber();

  it("assigns each migration a unique number (known historical collisions aside)", () => {
    const unexpected = Array.from(byNumber.entries())
      .filter(([number, files]) => files.length > 1 && !KNOWN_DUPLICATES.has(number))
      .map(([number, files]) => `${number}: ${files.sort().join(", ")}`);

    expect(
      unexpected,
      `New migration-number collision(s). Renumber the not-yet-merged migration to the ` +
        `next free number; do not add to KNOWN_DUPLICATES:\n${unexpected.join("\n")}`
    ).toEqual([]);
  });

  it("keeps KNOWN_DUPLICATES honest — no entry that is no longer actually doubled", () => {
    const stale = Array.from(KNOWN_DUPLICATES).filter(
      (number) => (byNumber.get(number)?.length ?? 0) < 2
    );

    expect(
      stale,
      `KNOWN_DUPLICATES lists number(s) that are no longer duplicated — drop them: ${stale.join(", ")}`
    ).toEqual([]);
  });
});
