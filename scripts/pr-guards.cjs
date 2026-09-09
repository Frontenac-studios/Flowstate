/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * PR regression guards (CI, pull_request only). Two independent checks that catch
 * the class of regression where a stale-based branch silently reverts newer work:
 *
 *   1. Test-deletion guard — a PR that removes test files (deletes them, or renames
 *      them to a non-test name) must say so explicitly. This is what would have
 *      caught #328: it deleted applied-line.test.ts + waiting-on-you.test.ts along
 *      with the code they covered, so nothing was left to go red.
 *
 *   2. Branch-freshness — the PR head must contain its base (main). A branch behind
 *      main can merge and drop commits that landed after its base — exactly how #328
 *      reverted W10g. NOTE: CI proves freshness only when it runs, not at merge time;
 *      the airtight version is GitHub's "Require branches up to date before merging"
 *      branch-protection toggle. This is the belt; that toggle is the braces.
 *
 * Pure helpers are exported for unit testing; git is only touched inside main().
 * Dependency-free (Node builtins only) so CI can run it without `npm ci`.
 *
 * Env (set by the workflow from the pull_request event):
 *   BASE_SHA  — tip of the base branch (github.event.pull_request.base.sha)
 *   HEAD_SHA  — tip of the PR branch  (github.event.pull_request.head.sha)
 *   PR_BODY   — the PR description     (github.event.pull_request.body)
 */
const { execFileSync } = require("node:child_process");

/** A path CI actually runs as a test: *.test|spec.ts|tsx under src/ | packages/ | e2e/. */
function isTestFile(path) {
  return /^(src|packages|e2e)\/.*\.(test|spec)\.(ts|tsx)$/.test(path);
}

/**
 * The acknowledgement that lets a deliberate test removal through: a `Removes-tests:`
 * line in the PR body with a non-empty reason after it. Case-insensitive, anchored to
 * a line start so it can't be matched inside prose.
 */
function hasRemovesTestsMarker(prBody) {
  if (!prBody) return false;
  return /^[ \t>*-]*removes-tests:[ \t]*\S+/im.test(prBody);
}

/**
 * Given `git diff --name-status` output (tab-separated), return the test files this
 * change loses. A `D` of a test file is a loss. An `R` (rename) is a loss only when a
 * test file becomes a non-test name — a test→test move (refactor) keeps coverage, so
 * it's fine. Anything that isn't a test file is ignored.
 */
function parseTestLosses(nameStatusOutput) {
  const losses = [];
  for (const line of nameStatusOutput.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("\t");
    const status = parts[0];
    if (status.startsWith("D")) {
      const path = parts[1];
      if (isTestFile(path)) losses.push(path);
    } else if (status.startsWith("R")) {
      const [, oldPath, newPath] = parts;
      if (isTestFile(oldPath) && !isTestFile(newPath)) losses.push(oldPath);
    }
  }
  return losses;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

/** Make a commit available locally; a shallow CI checkout may not have both tips. */
function ensureCommit(sha) {
  if (!sha) return;
  try {
    git(["cat-file", "-e", `${sha}^{commit}`]);
  } catch {
    try {
      git(["fetch", "--no-tags", "--depth=2147483647", "origin", sha]);
    } catch {
      // Best effort — if the fetch fails the check below surfaces a clear error.
    }
  }
}

function checkTestDeletions(baseSha, headSha, prBody) {
  // Three-dot: compare the merge-base of base/head against head, so deletions that
  // happened on main (not in this PR) are never blamed on the PR.
  const out = git(["diff", "--diff-filter=DR", "--name-status", "-M", `${baseSha}...${headSha}`]);
  const losses = parseTestLosses(out);
  if (losses.length === 0) return { ok: true };
  if (hasRemovesTestsMarker(prBody)) {
    console.log(
      `✓ test-deletion: ${losses.length} test file(s) removed, acknowledged by a "Removes-tests:" line.`
    );
    return { ok: true };
  }
  return {
    ok: false,
    message:
      `This PR removes ${losses.length} test file(s):\n` +
      losses.map((f) => `    - ${f}`).join("\n") +
      `\n\n  Removing tests alongside code is how a revert stays green (see #328 → #334).\n` +
      `  If this removal is intended, add a line to the PR description:\n` +
      `      Removes-tests: <why these tests are going>\n` +
      `  If it isn't, your branch is probably behind main — rebase and re-push.`,
  };
}

function checkFreshness(baseSha, headSha) {
  // Up to date ⇔ base is an ancestor of head (head already contains base).
  try {
    git(["merge-base", "--is-ancestor", baseSha, headSha]);
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        `This branch is behind its base (main): main has commits it doesn't contain.\n` +
        `  Merging as-is can silently drop or revert that newer work.\n` +
        `  Rebase onto (or merge in) the latest main, then push again.`,
    };
  }
}

function main() {
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA;
  const prBody = process.env.PR_BODY ?? "";

  if (!baseSha || !headSha) {
    console.error("pr-guards: BASE_SHA and HEAD_SHA must be set (pull_request event only).");
    process.exit(1);
  }

  ensureCommit(baseSha);
  ensureCommit(headSha);

  const results = [
    ["branch-freshness", checkFreshness(baseSha, headSha)],
    ["test-deletion", checkTestDeletions(baseSha, headSha, prBody)],
  ];

  let failed = false;
  for (const [name, result] of results) {
    if (result.ok) {
      console.log(`✓ ${name}: ok`);
    } else {
      failed = true;
      console.error(`\n✗ ${name}:\n  ${result.message}\n`);
    }
  }

  if (failed) process.exit(1);
  console.log("\nPR regression guards passed.");
}

if (require.main === module) main();

module.exports = { isTestFile, hasRemovesTestsMarker, parseTestLosses };
