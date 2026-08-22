# Kash 3.0 — Visual redesign build (flat-calm → Pinterest B&W)

> Handoff prompt for a fresh chat. Apply the in-flight visual redesign to the
> already-built sections of the Flowstate (Kash 3.0) repo. Staged into
> independently-shippable PRs; full scope (palette + components + per-page
> wireframes), mockup-driven for layout changes.

## Step 0 — reconcile before anything (the world may have moved since this was written)

1. `nvm use` (Node 20); `git fetch && git checkout main && git pull`.
2. Verify Phase 2 PR2 landed: GitHub PR #69 "feat(time): EoW roll-ups — weekly
   focus summary (Phase 2.5)". If merged, confirm its files are in main
   (src/lib/time/{aggregate-week,local-week-bounds}.ts, timeEntries.weeklyRollup,
   src/components/kash/week/WeeklySummaryCard.tsx, src/lib/projects/category-tokens.ts).
   If not merged, leave it; branch the redesign off fresh main regardless.
3. RE-READ these — the user co-edits them live, so treat the on-disk version as
   truth over anything quoted below:
   - `kash-3.0-visual-redesign.md` — the wireframe + palette decisions of record.
   - `kash-3.0-design-tokens.md` — the updated B&W token values (§2.1/§2.2).
   - `CLAUDE.md` — stack/conventions (Next 14 App Router, tRPC, Drizzle, Zod,
     strict TS, Conventional Commits, all work via PRs, never --no-verify,
     no public sign-up).
     Reconcile this plan against them; if they diverge, the docs win — re-pose any
     affected decision to the user before coding.

## The direction (from visual-redesign.md, locked Jun 24)

Pure-white surfaces, crisp near-black ink (~#16181d), minimal gray (hairline
dividers only). **Accent = black, no brand color.** Color is reserved for
**category** only (the Apple hexes), shown as a thin 3px left stripe per task
row. Primary buttons = OUTLINE (black border 1.5px, no fill, ink text).
Exceptions kept deliberately: Abyss (dark/immersive) and the Care garden (lush).

## Staged plan (each a PR off fresh main, data/foundational first)

### PR1 — palette/token roll (foundational, global, low-risk)

Single-file value swap in `src/styles/tokens.css` (every component reads semantic
tokens, so this propagates app-wide). Target values from design-tokens.md §2.1:

```
--bg:            #f5f6f8 → #ffffff
--surface-2:     #f7f8fa → #fafafa
--border:        #dcdfe5 → #ececec
--border-subtle: #e7e9ee → #f4f4f4
--ink:           #1f2430 → #16181d
--accent:        #2b3140 → #16181d
--accent-hover:  #3a4150 → #000000
--focus-ring:    rgba(43,49,64,.35) → rgba(22,24,29,.35)
(category --cat-* hexes unchanged; --surface/--on-accent unchanged)
```

KEEP `--accent-soft` as a variable (remap to a black-based rgba, e.g.
rgba(22,24,29,.12)). design-tokens.md drops it, but ~17 components consume it —
removing it belongs in PR2b, not here. Do NOT remove any token name in PR1.
Verify: typecheck + lint + `vitest run`, then browser-verify EVERY built page in
the new palette (today, this-week, projects, plan, abyss, care, settings) — check
contrast/legibility, no component that depended on graphite now looks broken.

### PR2a — flat finish / no glass (DT-1)

Strip `backdrop-blur` + glassy translucency (~55 spots; `src/styles/glass.css`
plus className usages in CommandPalette, ContextualInbox, ProjectsIndex,
ChatComposer, FocusChat, TimelinePane, MondayEntryModal, ConfirmDialog,
GanttRow, MillerColumn, …). Solid opaque surfaces + hairline borders only.
glass.css also aliases legacy --kash-\* names — keep the aliases, drop the blur.
Abyss stays dark (its own treatment), not flattened to white.

### PR2b — outline primary buttons

Audit the ~17 `bg-accent` / `bg-kash-accent` fill consumers. Convert true PRIMARY
ACTION buttons to outline (border 1.5px var(--ink), no fill, ink text, hover =
subtle ink wash). LEAVE active/selected/nav-pill states as black-filled (e.g.
active nav pill, Top-3 left border, segmented-switcher selected) — those are
"selected" affordances, not primary buttons. If a state is ambiguous, mockup it
and ask. The other accent-using element states (toggle, checkbox-checked, Top-3
star, links, focus ring) are TBD in the redesign — the PR1 token swap already
makes them black, which is the interim resolution; only redesign one further if
the user calls it out. This is also where `--accent-soft` removal lands if wanted.

### PR3+ — per-page wireframe restructures (one page per PR, MOCKUP-DRIVEN)

For each, render a faithful mockup with the visualize tool in the new B&W tokens,
re-pose open caveats via AskUserQuestion AFTER the user sees it, then build.
Resolve the conflicts noted below first.

- **Today**: summary band on top (date · Top-3 ①②③ · balance bar · List/Calendar/
  Review switcher); Today list gets the vertical room, triage folds in at top;
  composer pinned bottom (chat-style); REMOVE Tomorrow/This Week/Later buckets
  from Today (they belong to Week). Left nav + right chat rail unchanged.
- **Week**: keep 7 day-columns (today highlighted) · per-day 1–3 priorities ·
  per-category load cue · inbox/unscheduled rail · Draft week (AI) · Weekly
  review entry. Add a separate **Later backlog** for someday tasks (placement —
  below grid vs sub-view — settle in build). NOTE: the WeeklySummaryCard from
  PR2/#69 already sits at the top of this-week; fit it into the new wireframe
  (likely under/near the Weekly review entry) rather than leaving it orphaned.
- **Projects**: Miller columns full-width, **cut the docked task-detail panel**;
  task detail expands INLINE in the Tasks column (click-to-open in place). Move
  import history to its OWN page (linked, not a panel). Keep Miller+Timeline
  toggle, inline add-phase/task rows, project-card index (name·category·%).
  Caveat: blockers/recurrence fields are tight in a narrow column — may need a
  "more" affordance.
- **Focus**: minimal — task LEFT, full-height timer RIGHT (not a corner chip),
  no narration/chat. Done/Park on the task side, Esc exits, flat (no blur).
- **Settings**: left section-nav (sections left, content right). Sections:
  Account · Categories (rename/recolor the 5) · About me (§13 Values doc) ·
  Notifications · Preferences · AI/Kash · Data & sync. (This is the most
  genuinely-undesigned page — give it depth.)
  (Plan/Bingo/Abyss/Care are largely defined in their build specs; the redesign
  mainly applies the B&W treatment there — lower priority unless the user asks.)

## Conflicts to resolve with the user before the relevant PR

- **Category stripe always-on vs lens-gated.** visual-redesign.md says "color =
  category, 3px left stripe per task row" (reads as always-on). The stripe ALREADY
  exists in `src/components/kash/plan/TaskRow.tsx` (~lines 100–106) but is
  lens-gated by the VF-1 lens engine (only shows under the category reveal). Making
  it always-on contradicts VF-1's deliberate on-demand channels. Flag and ask —
  don't silently flip it. Affects Today + Week + Projects rows.
- **`--accent-soft` removal** — defer to PR2b (when its consumers are reworked),
  not PR1.

## Working agreement (carry these)

- Propose a plan with options + a recommendation; get explicit approval before
  editing. AskUserQuestion for genuine decisions. For UI/design choices, render
  faithful mockups with the visualize tool IN THE NEW B&W TOKENS (white #fff,
  near-black ink #16181d, black accent, category hexes: professional #009ddc /
  personal #973d97 / relationships #e03a3e / adulting #f6821f / body-mind
  #61bb47, shown as a 3px stripe) and re-pose the question after the user sees it.
- One logical unit per PR; foundational/global first (token roll), then
  components, then per-page layout. Pure logic → unit-tested helpers in src/lib
  (Vitest); thin components.
- After coding: `npm run typecheck` + `npm run lint` + `npx vitest run`, then
  browser-verify with the preview tools (screenshot the before/after). Commit per
  slice (Conventional Commits, lowercase subject), open a PR (base main).
  Co-author: Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>.

## Known gotchas (from prior sessions)

- `nvm use` before npm (Node 20). Branch each PR off FRESH main.
- Squash-merge hygiene: old branches look "unmerged" by ancestry — verify content
  is in main, delete with -D.
- Commit-msg lint: subject must be lowercase-start (not Sentence/Pascal/UPPER).
- A security hook false-positives on the literal call-syntax substring for the
  child-process spawn function (incl. RegExp matches) — avoid writing that literal.
- The user co-develops concurrently (edits kash-3.0-\*.md planning docs and
  sometimes code). Only commit YOUR chat's changes — cherry-pick by explicit path,
  never `git add -A`; check `git status` before staging; leave their docs/
  in-progress work alone (kash-3.0-visual-redesign.md, kash-3.0-mockups.html and
  other planning docs carry the user's uncommitted local edits — read but don't
  stage them).
- Preview: `.claude/launch.json` server name is "dev"; Next dev auto-ports; if the
  preview shows an "Awaiting server" data: URL it's still compiling — navigate to
  the real localhost:<port>/<route> and retry.

## Before coding

1. Do Step 0 (reconcile).
2. Confirm the staged plan + the two conflicts above with the user.
3. Start with PR1 (token roll). Get approval, then build slice by slice.
