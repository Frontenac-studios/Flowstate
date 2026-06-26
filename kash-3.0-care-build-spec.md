# Kash 3.0 — Care / Self-Care: Build Spec (subsections 7–8)

> Engineering spec for Care. Purpose, garden model & art, breathing, reflection, "what lifts me", and stats (subsections 1–6) are resolved in `kash-3.0-plan.md` §12. This doc covers the **data model, behavior, integration, and build order.**
>
> **Anchoring decisions:** Care is both a destination + ambient layer · adaptive/Finch-modeled guidance · hybrid (aware, never a scoreboard) · uniform seasonal garden that gently goes dormant + revives · detailed-illustrative garden art · pulsing-orb breathing (box-4 default, on-demand + stress offer) · hybrid reflection prompts + open space + **mood kept separate from tasks** · "what lifts me" = regulars + explicit marks · Care stats = self-care frequency / wins / mood (not balance).

## Current state

- `/care` route renders a `CareView` scaffold component (no data/logic). No care/garden/win tables exist.
- A generic EoD review exists (to be extended into the Care reflection ritual).

## Conventions (CLAUDE.md)

Drizzle one-table-per-file; RLS `auth.uid()` on every table (SQL in `supabase/rls/`); Zod inputs; pure utils in `src/lib/`; sync/offline parity in `packages/db-local` + `packages/sync`; Vitest; typecheck + lint gate.

---

## Subsection 7 — Data model

- **`care_activities`** (the Finch library + "what lifts me" home): `id, user_id, title, source` (`suggested | custom`), `kind` (`walk | breathe | reflect | custom`), `default_frequency NULL`, **`lifts_me boolean default false`** (explicit mark), `created_at`. Scheduling/doing one **spawns a task** (Body & Mind category) linked back.
- **`care_events`** (logged self-care): `id, user_id, activity_id NULL, kind, occurred_at, duration NULL`. A breathing session, a walk, a reflection = a care_event. Feeds frequency stats, garden nourishment, and wins.
- **`reflections`**: `id, user_id, date, scope` (`daily | weekly | monthly`), `prompt_text, body_text NULL, mood smallint NULL, created_at`. **Mood lives here, never on tasks.**
- **`garden_state`** (mostly computed): `user_id, season_anchor, last_active_at` (drives dormancy/revive), derived growth from `care_events`. Keep stored state minimal.
- **"What lifts me"** = derived: **regulars** (frequency over `care_events`) + **explicit** (`care_activities.lifts_me = true`). No separate table beyond the flag.
- **Daily wins** = computed per §12 (cross-cutting lens, auto-detected; only manual edits stored as overrides). Reuse the §12 model.
- RLS `auth.uid()` on all; mirror in `packages/db-local` + sync.

---

## Subsection 7b — Behavior / AI

- **Reflection prompts:** the **Reflection register** (§11) generates a **hybrid** prompt (light frame — a win · a drain · a forward note — personalized to the day) + an open text area; an optional one-tap **mood** after.
- **Breathing — stress offer:** a server check on **activity + mood** signals (a long unbroken focus block / a heavy or overdue day, factoring a recent low reflection mood) → a **gentle, dismissible** offer (auto-suggest tier, §11; never forced). Plus always on-demand.
- **"What lifts me" nudges:** gentle, occasional ("it's been a week since a morning walk") — minimal proactivity.
- **Stats aggregations:** self-care frequency + daily-wins hit-rate + mood trend (from `care_events` + `reflections`); **also feed the §7.6 weekly review.** Tone: gentle-informative + light motivation, no streaks/red.

---

## Subsection 8 — Integration & build

**Integration:**

- **Care hub** (`/care`, `CareView`) sub-views via the in-page switcher: Garden (home) · Self-care tasks (library) · Breathing · Reflection · Stats · What lifts me.
- **Today inline:** walk/breathing prompts between focus blocks (§6) + the 3-wins glance.
- **Reminders:** walks + breathing via the §15 notification layer (OS on Tauri desktop, in-app on web).
- **Sync/RLS** for all Care tables.

**Build order (stats-first per §12 — useful before lush):**

1. **Data model** — `care_activities`, `care_events`, `reflections`, minimal `garden_state`.
2. **Self-care library + "what lifts me"** — adopt/create activities; regulars + explicit hearts.
3. **Reflection rituals** — hybrid prompts + open space + mood (extend the EoD review).
4. **Stats** — self-care frequency / wins / mood; feed the weekly review. _(the stats-first substrate)_
5. **Breathing** — pulsing orb, presets (box-4 default), on-demand + activity+mood stress offer.
6. **Walk reminders + Today inline prompts.**
7. **The garden** — uniform, seasonal, dormant→revive, **detailed-illustrative** (the design spike) — ships last, atop the stats substrate.
8. **Verify** — Vitest (frequency/wins/garden-state derivation, stress-signal logic), manual QA (mood-not-on-tasks, dormancy revive, reminders), typecheck/lint/RLS audit.

## Open (settle during build)

- Garden detailed-illustrative asset set + growth/season visual rules (the design spike).
- Stress-signal thresholds (how long a focus block, how "heavy" a day).
- Breathing visualization motion detail → animation pass.
- Self-care-task ↔ recurrence interplay (a daily walk = a recurring care_activity).

---

## Library slice — detailed build plan (resolved Jun 25)

The **Tasks-tab library** (build step 2) now has a full build plan: **`kash-3.0-care-library-build-plan.md`** (+ visuals `kash-3.0-care-*.html`). Decisions locked this session:

- **D0** Scope = the Care _Tasks_ tab (Finch library); Abyss parked as next.
- **D1** Slice = library only (no garden/stats/breathing/reflection tabs yet).
- **D2** Practices live **separate in Care, pinnable** to Today/calendar ("Add to my day", one-off/repeating).
- **D3** Organization = **thematic, by need.**
- **D4** **6 themes** — Move · Calm · Connect · Rest · Nourish · Reflect (~23 seeds).
- **D5** Suggested catalog = **static seed in code** (reversible to a DB table).
- **D6** Cadence = optional, **pre-fills scheduling** via the recurrence engine.
- Approval confirms: keep nullable **`kind`**; **soft-remove** (`archived_at`); pin link = **`tasks.care_activity_id`** column; build branch **off `main`**.

Resolves the "self-care-task ↔ recurrence interplay" open item above for the library slice. Build (CL1–CL5) not yet started.
