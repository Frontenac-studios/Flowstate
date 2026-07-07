# Kash 3.1 — Consolidated build spec

> **Status:** Authoritative. This is the **single planning doc** for all work after "Kash 3.0
> complete." It consolidates: the Jul 2 2026 goals-vs-build re-audit (this branch), the UI decisions
> locked with Kat on Jul 2 2026, and the leftover tail items scattered across the 3.0 doc set.
>
> **Supersedes for planning purposes:** `kash-3.0-remaining-build.md`, the "What's left" section of
> `docs/build-status.md`, and the follow-up lists inside `kash-3.0-goals-vs-build.md`. The 3.0 spec
> docs (`kash-3.0-*-build-spec.md`) remain the reference for _how already-built features work_, but
> **new work is planned here and only here.** Do not add new items to the 3.0 docs.
>
> **Branch context:** `fix/morning-handoff-dismiss` currently carries two fixes (morning-handoff
> dismiss without awaiting the mutation; desktop auth-gate bypass for local release builds) and is
> under E2E testing in a parallel session. This spec assumes those land.

---

## 0. Why this doc exists

The Jul 2 re-audit held every feature area against its spec and the README goals. Verdict: the
mechanical product is strong, but the app repeatedly **senses and stores without acting or
showing** — self-care rows that aren't tappable, goal journeys with no pull-in action, win facets
computed but never displayed, a template-suggest chip nothing triggers, a morning "ritual" that
shipped as a bare dialog. Several status-doc ✅s overstate the code (auto-DND, morning hand-off,
Backlog reframe BK3–BK5). Three locked decisions have zero implementation (walk reminders, project
slip re-plan, project similarity).

Kash 3.1 = **close the last mile**. No new product surface; finish the promises.

---

## 1. Decisions locked (Jul 2 2026, design session with Kat)

| #   | Decision                          | Choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Morning hand-off layout           | **Full checklist modal** (single scroll) — extended: build the _entire Today list_ (carryover, recurring, project tasks due today, inline add, project-task search) **before** Top-3 selection.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D2  | Goal steering pull-in             | **Both** — "Work toward this today" button on the goal journey **and** a rotating, load-aware ghosted offer in the morning hand-off.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D3  | Self-care gap rows                | **Hybrid A/B** — dashed gap row with 1–2 inline offers (Walk / Breathe); each offer is a **one-tap start** that begins the session and logs the care event; dismissible.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D4  | EoD review trigger                | **Softened banner** — keep the banner surface; shrink it, soften copy ("when you're ready"), keep Open / Later, never auto-opens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D5  | Week per-day priorities           | **Priorities group at column top** (labeled, mirrors Today's Top-3 block), per WD1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D6  | Backlog pull action               | **One-tap "Today" button on every row** + overflow menu for Week / Project / Goal (closes BK5).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D7  | Daily Wins facets                 | **Colored icon badges** (Body · Mind · Soul) on the tracker; open facet reads as a gentle invitation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D8  | Scope of big unbuilt items        | **All four committed**: walk reminders + stress breathing, project slip re-plan, project similarity tagging, over-commit drift guard.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D9  | Section delineation               | **Tinted canvas, white cards** — page canvas ~`#f7f7f8` (new `--canvas` token); sections stay pure-white cards with existing hairlines; ink unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D10 | Color before data                 | **Category colors in the chrome** — accent stays black (DT-2 intact); the five category hues appear pre-data (ghost balance legend, tinted empty Top-3 hints, colored composer category chips, colored empty-state marks).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D11 | Today density                     | **Progressive disclosure locked** (chrome gated on data); **slim timeline rail: leaning yes** — the timeline stays first-class because calendar sync will eventually pull external events into it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D12 | Seeded empty content              | **Colored empty states only** — no ghost/seeded task rows (leaning; revisit only if empties still feel dead after D9–D11 land).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D13 | Cut-off text                      | **Standing rule** — text never clips unless its container visibly scrolls, and then only with a fade cue at the scroll edge.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D14 | Today micro-cleanups              | **All five approved** — single date, one composer hint (property chips on focus), sync badge only when meaningful, deadline chips after first pin.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D15 | Top-3 focus holds                 | **Auto-hold #1, ghost the rest** — pinning Top 3 auto-places a movable, deletable 45-min hold for the first priority in the next open slot; #2/#3 render as one-tap ghosts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D16 | Daily Wins facet colors           | **Cool trio** — Body teal `#0f6e56`, Mind indigo `#3a46c0`, Soul rose `#d4537e`; a separate family from the category palette so wins read as their own layer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D17 | Project-mode calendar hues        | **Rotate the existing Apple palette** (the five category solids + reserved yellow) — no new palette. **Supersedes** the §9.2 "project hues must not collide with category hexes" flag.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D18 | Nudge daily budget                | **Per-kind caps confirmed** — each nudge kind keeps its own 1/day budget (current code is the intended behavior); fix the "max one nudge/day" doc language to say per-kind.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D19 | Week grid on the tinted canvas    | **All-white day columns, marked today** — every day is a white card on the `--canvas` tint; today gets an ink border + black date pill. **Supersedes the Jun 24 inverted emphasis** (soft-gray days / lone white today); horizontal-scroll days stay.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D20 | Week pre-data color               | **Ghost tally on every column** — each day-column header carries a faint five-segment category strip that becomes that day's real tally as tasks land; page-level summary ghost legend too (D10).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D21 | Week density                      | **Chrome gated on data** (mirrors D11) — lens bar, ritual bar, and summary card appear with data; pin hint shown once on today's column; "Protect time" on column hover; scroll edge always shows a partial-column peek + fade (D13).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D22 | Project calendar task drag        | **Phase bars only** — the project calendar stays a phase-level surface; task dates move via Miller drag or the task-detail picker. **Amends** §9's "drag tasks across the calendar" wording; task-chip drag can be revisited later if missed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D23 | Miller columns on the canvas      | **Column cards on canvas** — outer strip card removed; each level is a white card, active level ink-bordered; ghost placeholder columns removed (drop targets appear during drag only). **Tight gap between columns; horizontal scroll retained** for deeper trees (peek + fade per D13).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| D24 | Project card color                | **As-is + ghost track when empty, category wash at ≥80%** — stripe + colored progress stay; "No tasks yet" gets a faint category-tinted ghost track; once a project passes 80% complete the card takes a faint category wash (finishing glow).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D25 | Project detail cleanups           | **All four approved** — syntax lesson collapses to a "syntax" chip (popover; full hint on composer focus); ghost columns removed; "Import history" moves into the ⋯ menu; blank project gets the D12 colored invitation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D26 | Loose-task categories on Projects | **Category-sectioned index** — project cards group under the five category headers; a category with projectless tasks shows a tinted "N tasks, no project → view" row (opens Backlog pre-filtered to that category lens); empty categories get the D12 invitation. Sections replace the CategoryFilter chips.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D27 | Backlog identity                  | **Light list, dark sky** — the view carries the theme: List renders on the D9 light system (practical staging surface); switching to Sky goes dark and immersive (stargaze mode, brightened category hues). Theme toggle retired.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D28 | Backlog toolbar density           | **Gated on data** (mirrors D11/D21) — pre-data the floating bar is search + List/Sky tabs; group/type/age filters appear once items exist; archive control appears only when the archive is non-empty, as "Archived · N" (B4's form).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D29 | Backlog cleanups                  | **All approved** — D12 colored empty state keeping the "deep" voice; "Nothing matches" gains a one-tap clear-filters action; age caption becomes a "parked Nd ago" pill; archive control confirmed as "Archived · N" (B4's form).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D30 | Settings shell                    | **Cards on canvas** — outer wrapper card removed; the tab bar and each section render as separate white cards directly on the `--canvas` tint (same language as D9/D19/D23). Kills the cards-in-card nesting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D31 | About-me sub-nav                  | **Solid sticky bar** — keep the pinned section jumps (Values · Work · Life · Constraints) but replace the legacy `backdrop-blur` + `bg-surface/95` with solid white + hairline bottom border.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D32 | Settings empty states             | **D12 colored invitations extend into Settings** — faint five-hue marks + tinted invitation on empty Values / Default Week, and a new explicit empty state for Constraints. **D12 is now app-wide**, not content-pages-only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D33 | Care tab structure                | **Five tabs** — Garden · Evidence · Tasks · Breathing · Reflection. Wins + Stats merge into **Evidence** (shrine/editions lead, frequency + mood charts below; garden renders once, on the hub). **Travel's tab retires** — its content (rest-day reservation + month-planning link) folds into a "Restorative time" card on the Garden hub.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D34 | Garden surface                    | **Full-bleed garden card** — the sky tint fills the card edge to edge (hills/plants run to the rounded border), caption on a solid strip at the foot. No-card-on-canvas noted as the aspiration once A.3 illustrated art lands.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D35 | Care cleanups                     | **All approved** — chrome emoji → lucide icons (moon/sparkles captions, drawn breathing orb that scales with the phase); wins empty state becomes a D12 invitation in the D16 facet trio; Travel card empty state gets warm copy + a "Reserve a rest day" action. Mood-emoji picker in Reflection is exempt (user-expressive input).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D36 | Morning hand-off presentation     | **Right-side sheet** — full-height panel slides in from the right; Today stays visible behind it so the day's list builds in view as items are confirmed. **Amends D1's "modal" wording** (checklist content and order unchanged).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D37 | EoD review presentation           | **Bookend** — the evening review shares the hand-off's right-sheet surface and rhythm: celebration first (done count, balance strip, wins), the T3 leftover triage at the end. Replaces the compact centered modal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D38 | Overlay cleanups                  | **All four approved** — 1) tokenize the hardcoded `bg-black/20` backdrop as `--backdrop` on every overlay; 2) command-palette hints render as key caps (V5); 3) Focus mode's sr-only ⌘↵ "Done" hint becomes a visible key cap beside the Esc hint; 4) EoD "Claude is reflecting…" gets a gentle pulse.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D39 | Miller column fidelity (Jul 7)    | **Fixed-width Finder columns; current build ratified over the frozen 3.0 walkthrough.** Every column is a fixed 256px (`w-64`), **never** stretch-to-fill — shallow trees leave open canvas to the right, deeper/narrow trees scroll horizontally (peek + fade per D13). This clarifies D23's intent and was the actual "not true Miller columns" bug (shipped PR #178). Reviewed one-by-one with Kat (incl. an A/B mockup of phase-detail placement), the current behavior is **kept in preference to the older spec**: **arbitrary nesting depth** (not MC-1's two-levels-max), **inline phase- and task-detail accordion** (not ID-3/PROJ-C's "detail heads the child column"), **pre-drill into the first-incomplete path** to fill the visible budget, **ghost placeholder columns on the blank/empty state** (amends D25's removal), and **completed items dimmed + sunk without a "Completed · n" group** (defers PROJ-A). Supersedes MC-1 / ID-3 / PROJ-C / PROJ-A in `kash-3.0-projects-miller.md` (left frozen). |

> D1–D8: goals-vs-build session. D9–D14: same-day design-pass session (per-option mockups
> reviewed with Kat); build detail in Track V (§10). D15–D18: follow-up decisions round the same
> day (per-option mockups; D17 is a deliberate override of an old 3.0 flag). D19–D21: This Week
> design pass (per-option mockups); build detail V9. D22 + B5/B6/F7: audit-straggler round
> (Jul 2 — the last unmapped findings from the seven-agent audit). D23–D25: Projects design pass
> (per-option mockups); build detail V10. D26–D28: Projects loose-tasks + Backlog design pass
> (per-option mockups); build detail V10/V11. D29: Backlog cleanups batch, approved. D30–D32:
> Settings design pass (audit/spec session; per-option mockups); build detail V12. D33–D35: Care
> design pass + its cleanups batch, approved (per-option mockups); build detail V13. D36–D38:
> Overlays design pass (audit/spec session; per-option mockups); build detail V14. D39: Miller
> column-fidelity ratification (Jul 7) — fixed-width fix shipped (PR #178); the current build is
> chosen over the frozen 3.0 walkthrough on depth, detail placement, ghost columns, and completed
> grouping.

---

## 2. Track T — Today ritual & daily loop

### T1 — Morning hand-off, rebuilt (L) · the flagship of 3.1

Replace the placeholder modal (`MorningHandoffModal.tsx`) with the full ritual, presented as a
**right-side sheet** per D36 (Today visible behind; V14 has the visual spec). **Order matters —
the user assembles the whole day before ranking it:**

1. **Opener** — the reassurance-class nudge from the arbiter (exists; keep at top).
2. **Yesterday** — unfinished tasks with per-row **keep / drop** (drop → Backlog, per §10; never
   silent rollover).
3. **Recurring due today** — today's occurrences to confirm/skip.
4. **Project tasks dated today** — any task in any project whose scheduled date is today appears
   here for one-tap confirmation into Today.
5. **Add more** — an inline composer row (reuse quick-input parser) **plus a project search**:
   type-ahead across projects → drill into a project's open tasks → pull one into Today.
6. **Goal step offer** (see G2) — at most one, ghosted accept/dismiss, load-aware.
7. **Top 3** — only now, choose Top 3 **from the assembled Today list** (tap-to-star from the list,
   not blank slots in a vacuum).
8. **Hold offer (D15)** — confirming Top 3 **auto-places a movable 45-min hold for priority #1**
   in the next open slot (shown here as a preview); #2/#3 render as one-tap ghost holds, here and
   on the timeline (`useTop3Assurance`).
9. **Begin day** — primary CTA; **Skip** always available; the dismiss-without-mutation fix on this
   branch is the baseline behavior.

Files: `src/components/kash/plan/MorningHandoffModal.tsx`, `MorningHandoffRunner.tsx`,
`src/hooks/useTop3Assurance.ts`, tasks/recurrence routers. Sub-IDs MH-1…MH-9 map to the list above.

### T2 — Self-care interleaving, real (M)

- **SC-1 Gap rows (D3):** make `TimelinePane` gap rows interactive — up to two offers (Walk 15m /
  Breathe 2m) + dismiss. One tap starts the session (walk = start a lightweight timer + log
  `care_event`; breathe = open the breathing orb inline/overlay) — no navigation to `/care` needed.
- **SC-2 Walk reminders (D8):** 2–3 offers/day scheduled around work blocks — pick gaps between
  calendar/focus blocks; deliver via the nudge arbiter (problem-free "reassurance-adjacent" class,
  gentle, dismissible) and the §15 notification layer on desktop.
- **SC-3 Stress-signal breathing (D8):** server check per `care-build-spec` 7b — long unbroken
  focus block or heavy/overdue day + recent low reflection mood → one gentle breathing offer
  (arbiter-routed, max 1/day).
- **SC-4 "What lifts me" nudges:** occasional "it's been a week since a morning walk" chip from
  regularity data (`lifts-me.ts`) — arbiter-routed, low priority.

### T3 — EoD review finish (M)

- **EOD-1 (D4):** soften the banner — smaller, copy "The day is winding down — a moment to reflect
  when you're ready", Review / Later. Never auto-opens.
- **EOD-2 Inline triage:** add a leftover-triage section to the review flow — each incomplete task:
  **reschedule (pick weekday) / move to tomorrow / drop to Backlog**. No silent rollover; whatever
  is untouched lands in tomorrow's hand-off carryover (T1.2).
- **EOD-3 Transparency:** when the midday Top-3 check-in is suppressed for over-commit, show a faint
  one-liner ("Check-in resting — today is full") instead of vanishing silently.

### T4 — Focus DND, verified (M)

- **DND-1:** verify/implement real OS-level DND on Tauri when a focus session starts (Tauri IPC);
  the Settings toggle and the "DND ON" label must reflect reality.
- **DND-2:** web in-app quieting — suppress in-app nudge/notification rendering while a focus
  session is active (`shouldSuppressInAppNudges` wired end-to-end).

---

## 3. Track G — Goals steer the day

- **G1 Journey CTA (D2):** "Work toward this today" button on the next incomplete milestone step in
  `GoalJourneyTimeline` → `pullGoalStepToToday()`; task lands in **today's bucket** (never
  `bucketOverride: "later"`).
- **G2 Morning offer (D2):** ghosted goal-step row in the hand-off (T1.6) — load-aware (skip when
  over-committed), **max one per morning, rotating across goals**, with per-day dedup.
- **G3 Dedup/rotation infra:** record goal-steering nudges per local date (extend `nudge_events`);
  rotation = least-recently-offered goal first.

---

## 4. Track W — Week & planning finish

- **W1 Priorities group (D5):** partition each `WeekColumn` into a labeled "Priorities" group (up
  to 3, starred, category-colored) above the rest.
- **W2 Drift guard (D8):** when the learned over-commit threshold exceeds the cold-start default by
  ≥30% over the lookback, emit a reflection-register note in the EoW review — "your typical day has
  grown ~N% in M weeks — intended?" (fulfills WD3; the spec explicitly rejected uncapped-learned
  with no guard).
- **W3 Threshold transparency:** the over-commit flag discloses its mode — "learning…" (cold-start)
  vs "based on your patterns" (learned) tooltip.
- **W4 Balance pass sources Backlog:** wire `fetchAbyssBalanceCandidates()` into
  `planning.suggestBalancePass` so suggestions draw from **Backlog + generated ideas** (PM6-1),
  merged and ranked floor-first.

---

## 5. Track P — Projects: the learning loop

- **P1 Slip re-plan (D8):** detect slip (a reschedule/actual pushes a phase or project past its end
  date) → Planner proposes new phase dates from real time-entry data → **confirm-card** (never
  silent). §9.5.
- **P2 Similarity (D8):** "Like this past one" picker on project create/complete + embedding-based
  inference (reuse the Backlog MiniLM seam); store a `project_similarity` relation; feeds template
  suggestions and duration learning. §9.3.
- **P3 Template chip trigger:** render `ProjectTemplateSuggestChip` when `completedAt` flips
  non-null (project workspace + index card), persistent until acted on/dismissed.
- **P4 Surfacing pass:** time-spent roll-ups at phase + project level (PhaseDetail, ProjectCard);
  thin progress bars in Miller phase rows; "learning… (N/3)" estimate hint wherever durations show,
  not just NewProjectForm.
- **P5 Consistency fixes:** resolve nesting depth (recommendation: cap UI + templates at
  project → phase → subphase → task; leave the self-reference schema as-is, document the cap).
  Project-mode hues are **settled by D17**: keep the existing Apple-palette rotation in
  `project-cycle-color.ts` (category solids + reserved yellow); just document it as intended and,
  if cheap, offset the rotation so a project's bar avoids matching its own category stripe.
  Calendar task drag is **settled by D22** (phase bars only — no build; §9 wording amended via F6).

---

## 6. Track B — Backlog polish

- **B1 One-tap Today (D6):** "Today" button on every row + overflow menu (Week / Project / Goal).
- **B2 Themes lens (BK3):** a light cluster-card lens (distinct toggle alongside Sky/List) leading
  with "keeps calling you" clusters; List default sort becomes recency (BK4).
- **B3 Animations:** add the two missing signature moments — promote rise-out, archive drift-away
  (`abyss-motion.css`), reduced-motion variants included.
- **B4 Archive discoverability:** an "Archived · N" affordance in the floating bar; desktop gets a
  daily scheduled archive sweep (web keeps lazy archive on `list()`).
- **B5 Cluster-naming nudge (S):** when the monthly stargazing review surfaces a new unnamed
  cluster, offer one-tap "name this pattern" applying the AI-suggested label
  (`suggestClusterName()` already exists — wire it into `AbyssMonthlyReview` / `AbyssEmergingCard`).
- **B6 Chat park auto-tagging (S):** "park this" from chat infers type + category via the existing
  category-inference seam instead of leaving them blank (user can still override on the item).

---

## 7. Track C — Care & reassurance polish

- **C1 Facet badges (D7, D16):** Body · Mind · Soul colored icon badges in `DailyWinsTracker` (and
  the Care history view); open facet phrased as invitation ("Soul is open — evening reflection
  counts"). Colors per D16: Body teal `#0f6e56`, Mind indigo `#3a46c0`, Soul rose `#d4537e` — add
  `--win-body/-mind/-soul` fill + text tokens to `tokens.css`.
- **C2 Evidence guardrails as logic:** thin-window rules in `generate-edition.ts` (few wins → short
  edition; no reflections → skip mood trend; hard length cap) + one QA pass over sample outputs.
- **C3 Evidence surfacing:** on larger-goal completion, a gentle "here's the trail" chip
  (arbiter-routed, reassurance class) linking to the shrine.
- **C4 Care stats facet split:** break self-care frequency down by facet in `CareStats` (gentle
  copy, no targets).
- _Parked (ideas backlog):_ garden seasonal cycle, full illustrated seed→grown art, travel-planning
  deepening.

---

## 8. Track A — AI companion completion

- **A1 Write-tool catalog:** implement the missing specced tools — `edit_task`, `delete_task`,
  `set_top3`, `set_protected_block`, `set_day_priorities`, `apply_balance_suggestions`,
  `create_project`, `edit_phase`, `move_task_to_phase`, `replan_project_dates` — all confirm-card
  gated. One tool per PR is fine.
- **A2 About-me everywhere:** inject `fetchAboutMeContextBlock()` into RDM narration, week-draft
  generation, and nudge text generation (currently chat + EoD only).
- **A3 Values weighting:** add the value-alignment instruction to the register prompts ("prefer and
  explain suggestions aligned with the user's values; urgency can still win").
- **A4 Arbiter ranking (D18):** enforce and test problem-class priority (persistent slip > balance
  starved > goal step); document the shared "over-committed" signal all nudge sources consume.
  Per-kind 1/day budgets are **confirmed as intended** (D18) — no global cap; update the "max one
  nudge/day" wording in prompts/docs to say per-kind.
- **A5 Undo for confirm-card:** extend `useSessionUndo` to capture confirm-card-applied actions so
  "everything is reversible" is true.

---

## 9. Track F — Foundations & fixes (small, do early)

| ID  | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Size |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| F1  | `--ink-faint` → `#767e8e` (DT-9 AA fix; currently `#9aa0ad`, ~2.6:1)                                                                                                                                                                                                                                                                                                                                                                                               | XS   |
| F2  | Blocked-task row treatment: dashed border + lock + "waiting on X" (TaskRow + MillerTaskRow)                                                                                                                                                                                                                                                                                                                                                                        | S    |
| F3  | Tag chips on TaskRow + Week grid (currently detail-panel only); finish LensControlBar tag filter                                                                                                                                                                                                                                                                                                                                                                   | M    |
| F4  | `glass.css` teardown once alias audit is clean — **deferred:** `--kash-*` aliases still used in `tailwind.config.ts`                                                                                                                                                                                                                                                                                                                                               | S    |
| F5  | Verify D2 sync detail panel expands from the footer dot with pending count / manual sync / conflicts                                                                                                                                                                                                                                                                                                                                                               | S    |
| F6  | ~~Status-doc truth pass~~ **✅ done Jul 3 (Phase A audit):** `docs/build-status.md` + `kash-3.0-goals-vs-build.md` scorecard match code (auto-DND, morning hand-off, BK3–BK5); both point here + `docs/kash-3.1-phase-a-completeness-audit.md`. §9 calendar-drag already D22-amended in `kash-3.0-plan.md`.                                                                                                                                                        | —    |
| F7  | ~~Verification sweep of the audit's "inferred" findings~~ **✅ done Jul 2 — all four pass in code:** unplaced-goals tray exists (`UnplacedGoalsTray` in `YearView`); balance-nudge baseline is genuinely learned (`category-baseline.ts`: 4-wk trailing avg, 3-wk cold-start suppression, starved = <60% of own usual, gated on ≥40% dominant); links underlined + 2px offset (`globals.css`); Top-3 star = `categorySolidVar` with ink fallback. No fixes needed. | —    |

---

## 10. Track V — Design pass & first-run (D9–D14)

From the Jul 2 design-pass session (the shipped Today held against a first-run screenshot;
per-option mockups reviewed per fork). D9/D10/D12/D13 apply app-wide; V3/V6 are Today-specific.
**Visual reference:** `kash-3.1-design-pass-mockups.html` — one combined mockup per page showing
the chosen options only (browser-openable, tab per page).

- **V1 Canvas & delineation (D9) · S:** new `--canvas: #f7f7f8` token (`src/styles/tokens.css` +
  Tailwind map); page background on all light pages moves to it; sections stay pure-white
  `--surface` cards with the existing `--border` hairlines. Guard: ink ramp and card white are
  untouched — this is off-white-canvas + white-cards, not the rejected "too gray" backdrop (DT-1
  rationale still holds). Abyss stays dark.
- **V2 Category color in empty chrome (D10) · S–M:** accent stays black everywhere. Pre-data
  color: `BalanceBar` renders a ghost five-segment legend (~45% tint) until real weights exist;
  empty Top-3 slots carry faint category-tinted hints; composer category chips get category tint +
  `--cat-*-text`; empty-state marks use the five hues. No new accent hue anywhere.
- **V3 Today density (D11) · M:** progressive disclosure — Top-3 renders as one compact row until
  the first pin (full slots + deadline/wind-down chips only after); balance bar hidden until ≥2
  tasks; lens bar behind a filter icon until the list is worth filtering; timeline hides the ⌘D
  decide slot, gap-suggestion rows, and sync badge until ≥1 task/block exists. **Slim rail
  (leaning yes — build after the disclosure work):** in List view the timeline collapses to a
  mini-map rail (blocks/events as ticks, bold now-marker) that expands on click; Calendar view
  keeps the full pane. **Forward constraint — calendar sync:** external calendar events will
  eventually be pulled into the timeline; reserve a neutral event-block treatment (visually
  distinct from focus and protected blocks) and design the rail so synced-event density reads at
  a glance. This constraint is why the timeline stays first-class on Today (the single-column
  option was rejected).
- **V4 Colored empty states (D12) · S:** no seeded/ghost task rows. Every empty surface (Today
  list, Week columns, Projects index, Backlog) gets category-colored marks + invitation copy
  ("Start your first task", never "Nothing here yet"-style dead ends).
- **V5 No-cutoff-text rule (D13) · S, then standing QA rule:** text never clips or truncates
  unless its container visibly scrolls, and then only with a fade cue at the scroll edge.
  Immediate fixes: pad the timeline grid so the first hour label clears the pane header; shortcut
  hints render as key caps ("⌃I", not "^I"); min-widths on chips so labels never mid-word
  ellipsize; fade masks on the timeline's scroll edges. Add to the PR review checklist.
- **V6 Today micro-cleanups (D14) · S:** date appears once (drop from the title-bar row, keep the
  page heading); one composer instruction line, property chips slide in on composer focus; "sync
  off" badge only when sync is on or erroring; "Top 3 by / wind down" chips gated on the first pin
  (overlaps V3).
- **V7 Rest-of-app pass · rolling:** apply V1/V2/V4/V5 globally first, then per-page passes in
  order: This Week → Projects → Backlog → Care → Abyss (V5 check only) → Settings → overlays
  (morning hand-off, review panel, focus mode, command palette). New forks only where a page has
  unique chrome; log them as D-numbers here.
- **V8 Onboarding & first-run flow · M:** an onboarding flow of immediate actions that bring
  excitement and delight **and are useful** — capture 2–3 real tasks (the parse chips are the
  delight) → pin one as today's #1 → optional time hold → confirm categories/colors → end on the
  morning hand-off so day 2 opens on a familiar ritual. Onboarding supplies the "first useful
  action" that seeded rows would have provided (D12). Depends on T1 + V2–V4; spec detail lands
  here when picked up.

- **V9 This Week pass (D19–D21) · M:** `WeekCanvas`/`WeekColumn` — drop the gray column track;
  every day renders as a white card (`--surface` + `--border` hairline) on the `--canvas` tint;
  today gets a 1px ink border + black date pill (weekday label inverted). **Supersedes the Jun 24
  inverted-emphasis wireframe decision** — contrast now comes from the ink marking, not the lone
  white column; horizontal-scroll days (4-of-7 viewport) stay. Each `ColumnTallyPopover` header
  carries a persistent five-segment category strip: ghost tint (~35%) pre-data per column, real
  weighted tally once that day has tasks (replaces hover-only discovery of the tally). Density
  mirrors D11: `LensControlBar`, `ProtectedWeekBar`, and `WeeklySummaryCard` gated on data;
  "Swipe right to pin" hint renders once, on today's column; `AddProtectedBlockButton` appears on
  column hover (always present on touch); the grid's right scroll edge keeps a partial-column peek
  - fade mask so cut columns read as scrollable (D13). W1 (priorities group, D5) builds on top of
    the white-card columns.

- **V10 Projects pass (D23–D25) · M:** `MillerColumnsView` — drop the outer strip card; each
  level renders as a white card directly on the `--canvas` tint with a **tight gap** (`--gap-sm`,
  not section-scale spacing); active level gets the 1px ink border; **columns are a fixed 256px
  (`w-64`) and never stretch (D39)**, so a shallow tree leaves open canvas to the right; the
  blank/empty project still shows dashed ghost placeholder columns beside the D12 invitation
  (**D39 retains these, amending D25**); drop-target outlines appear only during an active drag;
  the strip keeps `overflow-x-auto` so deeper trees horizontally scroll, with the D13
  partial-column peek + fade at the edge. `ProjectCard` — "No tasks yet" renders a faint
  category-tinted ghost track (D10); **at ≥80% weighted progress the card takes a faint category
  wash** (~6% tint bg + tinted track + category-text caption) as a finishing glow; below 80% cards
  stay pure white per D9. D25 cleanups: `NewItemRow` placeholder simplifies to "add phases and
  tasks — one per line" + a "syntax" chip (popover with the Parent//Child · ;;;+Phase forms; full
  hint also on composer focus); "Import history" link moves from `ProjectWorkspaceHeader` into
  `ProjectMenu`; blank project shows the D12 colored invitation in the first column. Calendar
  views inherit D17 hues + D19 treatment, no separate decisions. **D26 sectioned index:**
  `ProjectsIndex` gallery groups cards under five category section headers (dot + label); a
  category with projectless tasks renders a dashed tinted count row ("N tasks, no project →
  view") that navigates to Backlog with that category lens pre-applied (no new surface); a
  category with neither projects nor tasks gets the D12 invitation; `CategoryFilter` chips retire
  on this page (sections are the grouping). Section order fixed = category settings order.

- **V11 Backlog pass (D27–D28) · M:** `AbyssRoot` — **List view renders light** (D9 canvas +
  white cards, standard light category palette, dimming via row opacity/ink fade); **Sky view
  renders dark** (current `abyss-*` dark palette + brightened hues, star/constellation identity
  untouched); the view switch carries the theme, `AbyssTheme` localStorage toggle + sun/moon
  control retired. `AbyssFloatingBar` — pre-data: search + List/Sky tabs only; group/type/age
  filters mount once items exist; archive control renders only when the archive is non-empty, as
  "Archived · N" (B4). Composer keeps its colored category pills (already D10-compliant). Rides
  with B1–B4 work (same components). **D29 cleanups (approved):** D12 colored empty state keeping
  the "deep" voice; clear-filters action on the nothing-matches state; "parked Nd ago" age pill.
  **D13 audit fix:** `AbyssArchivedList.tsx:28` truncates archived titles with no scroll/fade —
  wrap the title (or make the list a scroll container with an edge fade). Note: `/abyss` now
  redirects to `/backlog`; this is the app's one dark-capable surface (Sky view, per D27).

- **V12 Settings pass (D30–D32) · S–M:** `SettingsForm` — drop the outer wrapper card
  (`rounded-card border bg-surface px-6 py-8`); the tab pill bar and each section card render
  directly on the `--canvas` tint; section cards keep their current white + hairline treatment
  (no nesting change inside). `AboutMeSection` sticky nav — solid `bg-surface` + hairline bottom
  border, `backdrop-blur`/`bg-surface/95` removed (D31; rides the F4 glass teardown). D32 empty
  states: Values gets faint five-hue marks + a category-tinted "Add your first value" invitation;
  Default Week's "No default blocks yet" gets the same treatment; Constraints gains an explicit
  empty state per group ("Nothing here yet — working hours and commitments live here" + dashed
  add). D13 fixes bundled: `ConstraintRow`'s `truncate` on the label becomes wrap (or fade cue if
  single-line is required); audit remaining labels for silent ellipsis. Survey note: Settings is
  otherwise fully tokenized (no hardcoded colors, no glass classes beyond the nav) — the
  `bg-black/20` overlay backdrops surveyed alongside belong to the Overlays pass (next), where
  they'll be tokenized as `--backdrop`.

- **V13 Care pass (D33–D34) · M:** `CareView`/`care-tabs.ts` — tab lineup becomes **Garden ·
  Evidence · Tasks · Breathing · Reflection**. New `CareEvidence` merges `CareWins` (shrine +
  editions, leading) with `CareStats` content (frequency bars, mood trend, recent wins, below);
  the duplicate `GardenScene` render in Stats is removed. `CareTravel` retires as a tab; its
  rest-day reservation list + "Open month planning" link become a "Restorative time" card on
  `CareGardenHome` (below the gentle prompt). Deep links/`?tab=` values for wins/stats/travel
  redirect to evidence/garden. `GardenScene` goes full-bleed inside its card: the `--g-sky` tint
  fills to the rounded border (no white padding frame), caption moves onto a solid white strip at
  the card's foot; nourish/dormant behavior unchanged. No-card-on-canvas revisit rides with A.3
  illustrated art. **D35 cleanups (approved):** chrome emoji → lucide + drawn orb, wins
  invitation in D16 facet colors, Travel-card empty copy + CTA (Reflection mood picker exempt).

- **V14 Overlays pass (D36–D38) · M:** `MorningHandoffModal` → **right-side sheet** (D36): full
  height, slides from the right over a `--backdrop` scrim that leaves Today readable behind it;
  hosts the T1 checklist (opener → carryover → recurring → project-tasks-today → add/search →
  goal offer → Top 3 → hold → Begin day); internal scroll with D13 fade cues. `EodReviewModal` →
  the same sheet surface as the evening **bookend** (D37): celebration first (done count, category
  balance strip, wins tracker), reflection middle, T3 leftover triage last; Esc keeps snoozing.
  D38 cleanups: new `--backdrop` token replaces `bg-black/20` on hand-off/EoD/command-palette;
  palette hint text becomes key caps; Focus's ⌘↵ hint becomes visible beside the Esc hint; EoD's
  "Claude is reflecting…" gets a gentle pulse (reduced-motion: static). Focus mode needs no fork —
  white card on the `--canvas` tint per D9; command palette likewise inherits. Build note: the
  sheet component should be one shared primitive (`RitualSheet`) used by both bookends.

### V-track progress log (design pass, page by page)

Decisions per page (D9/D10/D12/D13 apply globally; each page still gets a pass for its own
chrome). Status: ⬜ yet to propose · 🟡 proposed, awaiting decisions · ✅ decided · ⬛ built.

**Two-session split (Jul 2):** remaining page passes are divided so the two parallel sessions
never touch the same surface — the **design-pass session** continues its V7 order with
**Backlog → Care → Abyss (D13 check)**; the **audit/spec session** takes **Settings → Overlays**.
Log decisions here as usual; the next free D-number applies regardless of session.

| Page / surface                                       | Status                                                                                                     | Decisions                       |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Global tokens (canvas, category chrome, cutoff rule) | ⬛ built Jul 2                                                                                             | D9 D10 D12 D13                  |
| Today                                                | ⬛ built Jul 3 — V3/V6 remainder + V8 onboarding (#155)                                                    | D11 D14 V3 V6 V8                |
| This Week                                            | ⬛ built Jul 2 (#142)                                                                                      | D19 D20 D21 (V9) + W1 D5        |
| Projects (index + detail)                            | ⬛ built Jul 2 (#143)                                                                                      | D23 D24 D25 D26 D17 P4 P5 (V10) |
| Backlog                                              | ⬛ built Jul 2 (#144) — B1–B4; B5/B6 still open (Phase A audit)                                            | D27 D28 D29 (V11)               |
| Care                                                 | ⬛ built Jul 2 (#146) — V13 + C1–C4                                                                        | D33 D34 D35 (V13)               |
| Abyss                                                | ✅ audited Jul 2 — `/abyss` redirects to `/backlog`; one D13 fix (archived-title truncate) folded into V11 | —                               |
| Settings                                             | ⬛ built Jul 2 (#145)                                                                                      | D30 D31 D32 (V12)               |
| Overlays (hand-off, review, focus, palette)          | ⬛ built Jul 2 (#147) — `RitualSheet`, EoD bookend, `--backdrop`                                           | D36 D37 D38 (V14)               |

> **Phase A completeness audit (Jul 3 2026):** `docs/kash-3.1-phase-a-completeness-audit.md`.
> Open after audit: A1–A3/A5 (unmerged PR12), B5, B6, F4 deferred.

---

## 11. Suggested sequencing

1. **F-track fixes** (F1–F3 especially) — small, unblock everything visually.
2. **V-track visual lift** — V1/V2/V4/V5/V6 are small and app-wide; V3 rides with T1 (same Today
   surfaces); V7 rolls through pages as they're touched; V8 after T1 lands.
3. **T1 morning hand-off** — flagship; T3 EoD rides along (same daily-loop code).
4. **G1–G3 goal steering** — depends on T1 for the morning surface.
5. **T2 self-care interleaving** (SC-1 first, then SC-2/3 reminders + stress signal).
6. **W-track** (W1 quick; W2/W3 with the EoW review; W4 one-PR wire-up).
7. **B + C polish tracks** — parallelizable, low risk.
8. **A-track AI completion** — A2/A3 early (cheap, high leverage); A1 tools incrementally.
9. **P-track learning loop** (P3/P4 quick; P1/P2 are the two L-sized lifts — last).
10. **T4 DND** whenever a desktop-capable session is available for Tauri testing.

CI note: none of this touches `.github/workflows/`; all work runs on `ubuntu-latest` CI as usual.
Every schema addition follows the standing sync rules (batched push, keyset pull,
`(user_id, updated_at)` index, RLS `auth.uid()`).

---

## 12. Doc governance

- New work: **this doc only.** Check items off here; keep per-feature detail in-place (add sub-IDs,
  don't spawn new spec files unless a track grows past ~2 pages).
- `kash-3.0-*` docs: frozen as reference/provenance. `docs/build-status.md` stays the one-page
  snapshot but its "what's left" section should point here (F6).
- The audit behind this spec lives in the Jul 2 session transcript; its findings are fully folded
  into the tracks above.
