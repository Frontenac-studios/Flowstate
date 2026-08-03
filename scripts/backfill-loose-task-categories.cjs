/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * 1B backfill (decisions 0.3 / Q2 / 1.AId). One-time pass that gives every existing
 * task a category:
 *
 *   1. Project tasks  → inherit project.category (plain SQL, no AI).
 *   2. Loose tasks    → the SHARPER HOSTED model (Haiku) classifies the title into a
 *                       probability distribution over the five categories, gated by the
 *                       same floor + margin as the live classifier (1.AIc). A confident
 *                       guess is auto-applied; anything shaky/ambiguous is left as the
 *                       neutral unresolved marker (category='adulting', unresolved=true)
 *                       for the user to confirm later — never silently mislabeled.
 *
 * The live path uses a small LOCAL embedding model; this bulk pass swaps in Haiku behind
 * the same {category, confidence} contract, where accuracy matters and per-call cost is
 * irrelevant (1.AId / C4).
 *
 * Usage:
 *   node scripts/backfill-loose-task-categories.cjs            # apply
 *   node scripts/backfill-loose-task-categories.cjs --dry-run  # classify + report only
 *   node scripts/backfill-loose-task-categories.cjs --limit 5  # cap loose tasks processed
 *
 * Idempotent: only touches tasks with a NULL category or category_unresolved=true, so
 * re-running re-attempts the still-unresolved ones (e.g. after expanding prototypes).
 */
const { config } = require("dotenv");
const postgres = require("postgres");

config({ path: ".env" });
config({ path: ".env.local", override: true });

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Mirrors src/lib/projects/categories.ts (keys) and category-classifier.ts (gate).
const CATEGORIES = ["professional", "personal_projects", "relationships", "body_mind", "adulting"];
const CATEGORY_GUIDE = {
  professional: "paid work, job, clients, meetings, work projects",
  personal_projects: "self-directed creative or learning projects, hobbies, side builds",
  relationships: "family, friends, partner, social plans, gifts, staying in touch",
  body_mind: "health, fitness, exercise, medical/dental, rest, mindfulness",
  adulting: "chores, errands, bills, admin, home maintenance, logistics",
};
const FLOOR = 0.7;
const MARGIN = 0.1;
const FALLBACK_CATEGORY = "adulting";
const MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5";

const DRY_RUN = process.argv.includes("--dry-run");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : null;

function parseDistribution(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let raw;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return null;
  }
  // Keep only known keys; normalize to sum 1 so the floor is meaningful.
  const scores = CATEGORIES.map((c) => [c, Number(raw[c]) || 0]);
  const total = scores.reduce((acc, [, v]) => acc + v, 0);
  if (total <= 0) return null;
  return scores.map(([c, v]) => [c, v / total]).sort((a, b) => b[1] - a[1]);
}

async function classify(title) {
  const guide = CATEGORIES.map((c) => `- ${c}: ${CATEGORY_GUIDE[c]}`).join("\n");
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content:
            "You categorize a single personal to-do into five life areas. Respond with ONLY a " +
            "JSON object mapping each category key to a probability between 0 and 1 (they should " +
            "sum to about 1), reflecting how well the task fits each area. No prose.\n\n" +
            guide,
        },
        { role: "user", content: `Task: "${title}"` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const ranked = parseDistribution(text);
  if (!ranked) return null;

  const [topCategory, topProb] = ranked[0];
  const runnerUpProb = ranked[1] ? ranked[1][1] : 0;
  const confident = topProb >= FLOOR && topProb - runnerUpProb >= MARGIN;
  return { topCategory, topProb, runnerUpProb, confident };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is not set (required for the loose-task AI pass)");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

  console.log(`Backfill (${DRY_RUN ? "DRY RUN" : "APPLY"}) — model ${MODEL}\n`);

  // 1. Project tasks inherit their project's category.
  const projectTasks = await sql`
    SELECT t.id, p.category AS project_category
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.project_id IS NOT NULL AND (t.category IS NULL OR t.category_unresolved = true)
  `;
  console.log(`Project tasks to inherit category: ${projectTasks.length}`);
  if (!DRY_RUN) {
    for (const t of projectTasks) {
      await sql`
        UPDATE tasks SET category = ${t.project_category}, category_unresolved = false,
          updated_at = now() WHERE id = ${t.id}
      `;
    }
  }

  // 2. Loose tasks → AI classify + gate.
  let loose = await sql`
    SELECT id, title FROM tasks
    WHERE project_id IS NULL AND (category IS NULL OR category_unresolved = true)
    ORDER BY created_at
  `;
  if (LIMIT != null) loose = loose.slice(0, LIMIT);
  console.log(`Loose tasks to classify: ${loose.length}\n`);

  let applied = 0;
  let unresolved = 0;
  for (const t of loose) {
    let result = null;
    try {
      result = await classify(t.title);
    } catch (err) {
      console.warn(`  ! ${t.title} — classify failed (${err.message}); leaving unresolved`);
    }

    if (result && result.confident) {
      applied += 1;
      console.log(
        `  ✓ ${t.title}  →  ${result.topCategory} (${result.topProb.toFixed(2)}, ` +
          `Δ${(result.topProb - result.runnerUpProb).toFixed(2)})`
      );
      if (!DRY_RUN) {
        await sql`
          UPDATE tasks SET category = ${result.topCategory}, category_unresolved = false,
            updated_at = now() WHERE id = ${t.id}
        `;
      }
    } else {
      unresolved += 1;
      const why = result
        ? `${result.topCategory} ${result.topProb.toFixed(2)} below gate`
        : "no usable response";
      console.log(`  · ${t.title}  →  unresolved (${why})`);
      if (!DRY_RUN) {
        await sql`
          UPDATE tasks SET category = ${FALLBACK_CATEGORY}, category_unresolved = true,
            updated_at = now() WHERE id = ${t.id}
        `;
      }
    }
  }

  console.log(
    `\nSummary: ${projectTasks.length} project-inherited · ${applied} AI-applied · ` +
      `${unresolved} left unresolved${DRY_RUN ? " (nothing written)" : ""}`
  );
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
