# Kash 3.0 — Care Self-Care Library: Build Plan

> Scope: the **Tasks** tab of `/care` (§12) — the Finch-style self-care library. Library slice only (no garden / stats / breathing / reflection tabs). Abyss (§10) is parked as the explicit next feature.
> Status: **PLAN — awaiting approval.** No code written yet.

## Decision log (this session)

| #   | Decision                  | Choice                                                                                                  |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------- |
| D0  | Scope                     | Care §12 self-care library = the **Tasks** tab. Abyss parked as next.                                   |
| D1  | First slice width         | **Library only.**                                                                                       |
| D2  | Where practices live      | **Separate in Care by default, pinnable** to Today/calendar via "Add to my day" (one-off or repeating). |
| D3  | Library organization      | **Thematic — by need.**                                                                                 |
| D4  | Theme set                 | **6 themes:** Move · Calm · Connect · Rest · Nourish · Reflect (~23 seed practices).                    |
| D5  | Suggested-catalog storage | **Static seed in code** (for now; reversible to a DB table later).                                      |
| D6  | Practice cadence          | Optional cadence that **pre-fills scheduling** via the shipped recurrence engine.                       |

## Re-baseline (actual code state, Jun 25)

- **Data spine complete:** categories, time-tracking, dependencies, **and recurrence (4A–4G)** all shipped & synced. `rrule` installed. (Your heads-up re: `npm install rrule` / pending 4A migration is now stale.)
- **HEAD:** `feat/planning-foundation`; `projects-index-bw-progress` already merged.
- **`/care` is a shell** — `CareView.tsx` placeholder switcher; **no** care tables, **no** care tRPC router. Greenfield.

---

## Data model

Two new tables, one enum, one link. Conventions: Drizzle one-table-per-file (`src/db/schema/`), SQLite mirror in `packages/db-local/src/schema/`, RLS SQL in `supabase/rls/`, register in `packages/sync/src/tables.ts` + both schema `index.ts`.

### `care_activities` — a practice (adopted or custom)

```
id            uuid pk
user_id       uuid not null            -- RLS auth.uid()
title         text not null
theme         care_theme not null      -- enum below
kind          care_kind null           -- walk | breathe | reflect | custom (forward-compat — D6 confirm: KEEP)
cadence       care_cadence null        -- null | daily | most_days | weekly | when_needed
note          text null
source        care_source not null     -- suggested | custom
catalog_key   text null                -- origin seed key (suggested only); de-dupe adopts
archived_at   timestamptz null         -- soft "remove from my list" (confirmed: soft-remove)
created_at / updated_at
```

- `care_theme` enum: `move | calm | connect | rest | nourish | reflect`.
- `care_kind` enum: `walk | breathe | reflect | custom`. Nullable; seeds set it where obvious (walk→walk, breathe→breathe, reflect→reflect, else custom). Reserved for later breathing/walk deep-links.
- `care_cadence` enum: `daily | most_days | weekly | when_needed`. Label is derived from the enum.

### `care_events` — a check-off / "I did this"

```
id               uuid pk
user_id          uuid not null
activity_id      uuid null references care_activities(id) on delete set null
occurred_at      timestamptz not null default now()
duration_minutes integer null          -- forward-compat (walk length etc.); unused in this slice
created_at
```

### Pinning link (D2) — **confirmed: column on `tasks`**

"Add to my day" creates a normal task (`category = body_mind`, title = practice title) and, if repeating, a `task_recurrence` row — **all via the existing spine.** Link back via a nullable column on the existing table:

```
ALTER TABLE tasks ADD COLUMN care_activity_id uuid
  REFERENCES care_activities(id) ON DELETE SET NULL;   -- null for all non-care tasks
```

- Touches the shipped `tasks` table (additive, nullable — safe migration). Mirror the column in `packages/db-local` `tasks` schema.

### Cadence → recurrence prefill (D6)

When pinning, the cadence pre-fills the Repeat picker (overridable):
`daily → RRULE FREQ=DAILY` · `weekly → FREQ=WEEKLY` · `most_days → FREQ=DAILY` (soft) · `when_needed → one-off, no repeat`.

---

## Seed catalog (static — D5)

`src/lib/care/seed-catalog.ts` — a typed array of ~23 entries `{ key, title, theme, cadence? }`, grouped by the 6 themes (draft content in `kash-3.0-care-q4-seed-catalog.html`). Pure data; **Adopt** copies an entry into `care_activities` (`source:"suggested"`, `catalog_key:key`). Catalog view hides already-adopted keys.

---

## tRPC — `care` router (`src/trpc/routers/care.ts`, mount in `_app.ts`)

| Procedure         | Type     | Does                                                      |
| ----------------- | -------- | --------------------------------------------------------- |
| `listActivities`  | query    | your practices (theme-grouped, non-archived)              |
| `catalog`         | query    | seed entries minus already-adopted                        |
| `adopt`           | mutation | copy a seed key → `care_activities`                       |
| `createCustom`    | mutation | new custom practice (Zod: title, theme, cadence?, note?)  |
| `updateActivity`  | mutation | edit fields                                               |
| `archiveActivity` | mutation | soft-remove from list                                     |
| `logEvent`        | mutation | check-off → `care_events` row                             |
| `addToMyDay`      | mutation | spawn body_mind task (+ recurrence if cadence) + join row |
| `recentEvents`    | query    | for the row's "done today" state                          |

Pure logic (cadence→RRULE map, adopt de-dupe) in `src/lib/care/` for unit testing.

---

## UI — Tasks tab in `CareView`

Replace the placeholder. New components under `src/components/kash/care/`:

- **`CareTasksTab`** — owns the tab. Two zones: **Your practices** (theme sections, each row = check box · title · cadence hint · ⋯ menu) and **Suggested** (theme-grouped, Adopt buttons).
- **`PracticeRow`** — check-off, "done today" state, ⋯ menu (Add to my day · Edit · Remove).
- **`CreatePracticeDialog`** — title* · theme* · cadence? · note? (matches `kash-3.0-care-q6-fields-cadence.html`).
- **`AddToMyDaySheet`** — date / repeat, cadence-prefilled.

Other Care tabs (Garden, Breathing, Reflection, Stats, Travel) stay as "coming soon" shells this slice.

---

## Build phases (one PR each, Conventional Commits, hooks on)

1. **CL1 — Data model.** Tables + enums + join + RLS + db-local mirror + sync registry. `feat(care): self-care library data model + rls`.
2. **CL2 — Seed catalog + cadence util.** `seed-catalog.ts` + cadence→RRULE map + Vitest. `feat(care): seed catalog and cadence mapping`.
3. **CL3 — care router.** Procedures + Zod + tests, mount in `_app`. `feat(care): tRPC router for the library`.
4. **CL4 — Tasks-tab UI.** Components + wiring + adopt/create/check-off/add-to-my-day. `feat(care): self-care library Tasks tab`.
5. **CL5 — Verify.** typecheck · lint (max-warnings 0) · Vitest · RLS audit · manual QA checklist.

**Branch (build):** `feat/care-library` — **base = `main`** (confirmed). Cut when the design-tokens work in the tree is committed and `main` checkout is clean. _(This plan doc itself is committed on `feat/planning-foundation` per the dirty-tree decision.)_

---

## Sandbox limitation

This build sandbox **can't run migrations or tests** (Node-version + arch gates). So after each phase **you run locally**: `npm run db:generate` (CL1), `npm run typecheck && npm run lint && npm run test` (each phase). I'll write the code + migration SQL; verification is your local step.

---

## Open items — RESOLVED at approval (Jun 25)

1. **`kind` column** — ✅ **KEEP** now (nullable `care_kind`), for forward-compat with breathing/walk deep-links.
2. **`archived_at` soft-remove** — ✅ soft-remove (no hard delete).
3. **Pin link** — ✅ **column on `tasks`** (`tasks.care_activity_id`, nullable FK), mirrored in db-local.
4. **Branch base (build)** — ✅ **`main`**.

## Next action

Plan approved & recorded. Build (CL1→CL5) is **not yet started** — kick off when ready by cutting `feat/care-library` off a clean `main`.
