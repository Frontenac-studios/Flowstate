# Kash 3.1 — Phase A completeness audit

> **Date:** Jul 3 2026 · **Branch:** `main` @ `7d1e726` (onboarding / Today density, #155)  
> **Scope:** Read-only checklist against `kash-3.1-consolidated-build-spec.md`.  
> **Code fixes in this PR:** none (F6 doc-truth only).  
> **L gaps:** GitHub issues (do not scope-creep).

Legend: **built** · **gap** (size in parens) · **deferred** (explicitly parked)

---

## Track T — Today ritual & daily loop

| ID          | Item                                            | Status                 | Evidence                                                                                                                                                                                                                                                                                                                                        |
| ----------- | ----------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1 / MH-1…9 | Morning hand-off full ritual (right-side sheet) | **built** (S residual) | `MorningHandoffModal` + `RitualSheet` (D36): opener, carryover keep/drop, recurring, project-tasks-today, composer + project search, goal offer, Top 3 from assembled list, #1 hold preview (D15), Begin day / Skip. **Residual:** #2/#3 are decorative “ghost hold” labels only — not one-tap place holds (`useTop3Assurance` offers #1 only). |
| T2 / SC-1   | Interactive gap rows (Walk / Breathe)           | **built**              | `SelfCareGapRow.tsx` in `TimelinePane` — one-tap walk timer + breathe.                                                                                                                                                                                                                                                                          |
| T2 / SC-2   | Walk reminders (2–3/day, arbiter)               | **built**              | `evaluateSelfCareWalkReminders` in `run-nudge-evaluation.ts` (in-app arbiter chips; no separate Tauri OS notification API).                                                                                                                                                                                                                     |
| T2 / SC-3   | Stress-signal breathing                         | **built**              | `evaluateStressBreathing` wired in nudge evaluation.                                                                                                                                                                                                                                                                                            |
| T2 / SC-4   | "What lifts me" nudges                          | **built**              | `evaluateLiftsMeNudge` + `deriveLiftsMe` / `lifts-me.ts`.                                                                                                                                                                                                                                                                                       |
| T3 / EOD-1  | Softened EoD banner                             | **built**              | `EodReviewBanner` — "when you're ready"; never auto-opens.                                                                                                                                                                                                                                                                                      |
| T3 / EOD-2  | Leftover triage                                 | **built**              | `EodLeftoverTriage` — reschedule / tomorrow / Backlog.                                                                                                                                                                                                                                                                                          |
| T3 / EOD-3  | Midday check-in transparency                    | **built**              | `formatMiddayCheckinLine` → "Check-in resting — today is full".                                                                                                                                                                                                                                                                                 |
| T4 / DND-1  | OS-level DND on Tauri                           | **built**              | `apps/desktop/src-tauri/src/dnd.rs` + `os-dnd.ts`; Focus shows "DND ON" when applied.                                                                                                                                                                                                                                                           |
| T4 / DND-2  | In-app quieting during focus                    | **built**              | `shouldSuppressInAppNudges` in `useEssentialNudges` / `useEodReviewTrigger`.                                                                                                                                                                                                                                                                    |

---

## Track G — Goals steer the day

| ID  | Item                                 | Status    | Evidence                                                                                 |
| --- | ------------------------------------ | --------- | ---------------------------------------------------------------------------------------- |
| G1  | Journey CTA "Work toward this today" | **built** | `GoalJourneyTimeline` → `pullGoalStepToToday`.                                           |
| G2  | Morning goal-step offer              | **built** | Ghosted offer in hand-off; load-aware when over-committed.                               |
| G3  | Dedup / rotation infra               | **built** | Goal-steering via `nudge_events` + `fetch-goal-steering-offer` (least-recently-offered). |

---

## Track W — Week & planning

| ID  | Item                             | Status    | Evidence                                                                  |
| --- | -------------------------------- | --------- | ------------------------------------------------------------------------- |
| W1  | Priorities group on `WeekColumn` | **built** | Labeled priorities block (D5) on week columns.                            |
| W2  | Drift guard in EoW               | **built** | `evaluateOverCommitDrift` → `overCommitDriftNote` on `WeeklySummaryCard`. |
| W3  | Threshold transparency           | **built** | `overCommitMode` cold-start vs learned on week columns.                   |
| W4  | Balance pass sources Backlog     | **built** | `fetchAbyssBalanceCandidates` in week-reviews / balance pass path.        |

---

## Track P — Projects learning loop

| ID  | Item                                           | Status    | Evidence                                                                                                           |
| --- | ---------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| P1  | Slip re-plan confirm-card                      | **built** | `ProjectSlipReplanCard` + `proposeSlipReplan` / `applySlipReplan` (#153).                                          |
| P2  | Similarity tagging                             | **built** | `project_similarity` table + picker / inference (#154).                                                            |
| P3  | Template chip on `completedAt`                 | **built** | `ProjectTemplateSuggestChip` trigger (#152).                                                                       |
| P4  | Time roll-ups, Miller bars, learning hints     | **built** | Phase/project `timeSpentSeconds`, `EstimateConfidenceHint`, Miller progress.                                       |
| P5  | Nesting cap, D17 hues, D22 phase-only calendar | **built** | `nesting-cap.ts`, `project-cycle-color.ts` (D17); calendar phase bars only (D22). §9 plan wording already amended. |

---

## Track B — Backlog polish

| ID  | Item                                       | Status      | Evidence                                                                                                                                                       |
| --- | ------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | One-tap Today + overflow Week/Project/Goal | **built**   | `AbyssPromoteMenu` / list promote affordances (V11 / #144).                                                                                                    |
| B2  | Themes lens + List recency (BK3–BK4)       | **built**   | `AbyssThemes` + `AbyssViewMode` includes `"themes"` (D27).                                                                                                     |
| B3  | Promote rise-out / archive drift-away      | **built**   | `abyss-motion.css` (`abyss-promote-rise`, `abyss-archive-drift`).                                                                                              |
| B4  | "Archived · N" + desktop daily sweep       | **built**   | `AbyssFloatingBar` + `useAbyssDailyArchiveSweep`.                                                                                                              |
| B5  | Cluster-naming nudge (one-tap AI label)    | **gap (S)** | `suggestClusterName` wired in `AbyssEmergingCard` as suggest-then-apply, not one-tap apply. `AbyssMonthlyReview` has **no** naming nudge for unnamed clusters. |
| B6  | Chat park auto-tagging                     | **gap (S)** | `parkInAbyss` in `chat-tools.ts` uses caller-supplied type/category only — no `inferCategory` seam.                                                            |

---

## Track C — Care & reassurance

| ID  | Item                                        | Status    | Evidence                                                                                                           |
| --- | ------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| C1  | Facet badges (D7/D16)                       | **built** | `DailyWinsTracker` + `--win-body/-mind/-soul` tokens.                                                              |
| C2  | Evidence guardrails                         | **built** | `applyEditionGuardrails` in `template-evidence-narrative.ts` (thin window, length cap).                            |
| C3  | Evidence surfacing on large-goal completion | **built** | `evidence_surface` nudge: "Here's the trail…". **Note:** only evaluated when `planningSurface === "care"`.         |
| C4  | Care stats facet split                      | **built** | `facetFrequencies` in `buildCareStatsSummary`, rendered in live `CareEvidence` (orphan `CareStats.tsx` unmounted). |

---

## Track A — AI companion

| ID  | Item                                      | Status      | Evidence                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Write-tool catalog (10 tools)             | **gap (L)** | Main has `reschedule_tasks`, `create_task`, `complete_task`, `replan_project_dates` only. Missing: `edit_task`, `delete_task`, `set_top3`, `set_protected_block`, `set_day_priorities`, `apply_balance_suggestions`, `create_project`, `edit_phase`, `move_task_to_phase`. **Implemented on unmerged branch** `feat/kash-3.1-pr12-ai-companion` (`4842372`). |
| A2  | About-me in RDM / week-draft / nudge text | **gap (S)** | RDM + nudge already get About-me via `assembleChatContext` → `contextBlock`. **Missing:** week-draft (`generate-week-draft.ts` — constraints only). PR12 covers the week-draft path.                                                                                                                                                                         |
| A3  | Values weighting in register prompts      | **gap (S)** | `VALUES_ALIGNMENT` instruction exists on PR12 only; main prompts lack it.                                                                                                                                                                                                                                                                                    |
| A4  | Arbiter ranking + per-kind budgets        | **built**   | `rankProblemNudges` (slip > balance > goal step); D18 per-kind budgets; tests in `nudge-arbiter.test.ts`.                                                                                                                                                                                                                                                    |
| A5  | Undo for confirm-card                     | **gap (M)** | `useSessionUndo` is complete/delete only on main. PR12 extends confirm-card undo (`confirm-undo.ts`).                                                                                                                                                                                                                                                        |

**A-track note:** Land PR12 as one issue rather than piecemeal S fixes — it is a single ~2.1k-line commit covering A1–A3 + A5.

---

## Track F — Foundations

| ID  | Item                              | Status              | Evidence                                                                                                                                     |
| --- | --------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | `--ink-faint` → `#767e8e`         | **built**           | `tokens.css`.                                                                                                                                |
| F2  | Blocked-task row treatment        | **built**           | `TaskRow` dashed border + lock + "waiting on X".                                                                                             |
| F3  | Tag chips + lens tag filter       | **built**           | `TaskTagChips` on `TaskRow`; `LensControlBar` tag filter; week maps `tags`.                                                                  |
| F4  | `glass.css` teardown              | **deferred**        | `--kash-*` still in `tailwind.config.ts` / `glass.css` (spec-deferred).                                                                      |
| F5  | Sync detail panel from footer dot | **built**           | `SyncFooterIndicator` + `SyncFooterDetailPanel` (pending count / manual sync).                                                               |
| F6  | Status-doc truth pass             | **built (this PR)** | `docs/build-status.md`, `kash-3.0-goals-vs-build.md`, V-track log in build spec. §9 calendar-drag already D22-amended in `kash-3.0-plan.md`. |
| F7  | Inferred-findings verification    | **built**           | Spec-marked done Jul 2.                                                                                                                      |

---

## Track V — Design pass (progress log)

| Row                            | Status                 | Notes                                                                                                                                                                                     |
| ------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global tokens (D9/D10/D12/D13) | **built** (S residual) | `--canvas` token + Tailwind map exist. **Residual (V1):** `.kash-backdrop` still paints `var(--bg)` (#fff), so `AppBackdrop` keeps the shell white unless a page sets `bg-canvas` itself. |
| Today (V3/V6/V8)               | **built** (S residual) | Progressive disclosure, slim timeline rail, micro-cleanups, onboarding (#155). **Residual (V5):** timeline scroll-edge fade masks missing; standing truncate audit incomplete.            |
| This Week (V9 + W1)            | **built**              | White day cards, ghost tally, density gating.                                                                                                                                             |
| Projects (V10 + P4/P5)         | **built**              | Miller cards on canvas, sectioned index (D26), finishing glow.                                                                                                                            |
| Backlog (V11 + B1–B4)          | **built**              | List light / Sky dark / Themes; floating-bar density; D29 cleanups.                                                                                                                       |
| Care (V13 + C1–C4)             | **built**              | Garden · Evidence · Tasks · Breathing · Reflection; full-bleed garden.                                                                                                                    |
| Abyss                          | **audited**            | `/abyss` → `/backlog`; D13 archived-title folded into V11.                                                                                                                                |
| Settings (V12)                 | **built**              | Cards on canvas, solid sticky About-me nav, D32 empties.                                                                                                                                  |
| Overlays (V14)                 | **built**              | Shared `RitualSheet`; EoD bookend; `--backdrop`; key caps / pulse.                                                                                                                        |

V7 (rest-of-app rolling) is satisfied by the per-page passes above.

---

## "Sensed / stored without acting or showing" leftovers

Original Jul 2 list (self-care gaps, goal pull-in, win facets, template chip, placeholder hand-off, overstated auto-DND / BK3–BK5) is **closed** in code.

**Still open:**

1. **A1** — Companion can discuss plan changes but cannot propose most write tools (edit/delete/top-3/protected blocks/projects/phases). Action catalog incomplete on main.
2. **A2** — About-me reaches chat, EoD, RDM, and nudge via `assembleChatContext`; **week-draft** still omits it.
3. **A5** — Confirm-card applies are not captured by session undo ("everything is reversible" incomplete for AI writes).
4. **B5** — `suggestClusterName` exists; monthly stargazing review never offers one-tap naming for unnamed clusters (EmergingCard is suggest-then-tag, not one-tap apply).
5. **B6** — Chat "park this" stores items without auto type/category inference.
6. **T1 residual** — #2/#3 ghost holds are labels only (not one-tap place).
7. **V1 residual** — global `AppBackdrop` still white (`--bg`), not `--canvas`.
8. **V5 residual** — timeline scroll-edge fade masks missing.

---

## F6 cross-check (pre-fix → post-fix)

| Doc claim (before this PR)                                    | Code reality                              | Action                                        |
| ------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| Morning hand-off is a **placeholder modal**                   | Full ritual + `RitualSheet`               | Corrected in `docs/build-status.md`           |
| Auto-DND **unverified** on Tauri                              | `dnd.rs` + Focus "DND ON"                 | Corrected                                     |
| BK3–BK5 overstated / unclear                                  | B2–B4 built; B5/B6 still open             | Scorecard + build-status note remaining B5/B6 |
| V-track log: Backlog / Care / Settings / Overlays "not built" | All built via #144–#147                   | Progress log updated in build spec            |
| Scorecard goal 11 auto-DND                                    | Accurate now                              | 3.1 follow-up section refreshed               |
| §9 calendar task drag                                         | Already D22-amended in `kash-3.0-plan.md` | No change                                     |

---

## Gap disposition

| Gap                                         | Size       | Disposition                                                                                                |
| ------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| A1 (+ A2 week-draft, A3, A5 on same branch) | L (bundle) | [#156](https://github.com/Frontenac-studios/Flowstate/issues/156) — land `feat/kash-3.1-pr12-ai-companion` |
| B5 cluster-naming one-tap                   | S          | Listed; follow-up PR (not this audit)                                                                      |
| B6 park auto-tag                            | S          | Listed; follow-up PR (not this audit)                                                                      |
| T1 #2/#3 one-tap ghost holds                | S          | Listed; follow-up PR (not this audit)                                                                      |
| V1 AppBackdrop → `--canvas`                 | S          | Listed; follow-up PR (not this audit)                                                                      |
| V5 timeline edge fades                      | S          | Listed; follow-up PR (not this audit)                                                                      |
| F4 glass teardown                           | deferred   | Unchanged                                                                                                  |

Phase A operating rule: read-only audit preferred; only F6 doc-truth in this PR.
