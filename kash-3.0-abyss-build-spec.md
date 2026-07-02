# Kash 3.0 — The Abyss: Build Spec (Phases 6–8)

> Engineering spec for the Abyss. Product / UX / UI / motion / identity (Phases 1–5) are resolved in `kash-3.0-plan.md` §10. This doc covers the **data model, AI behavior, integration, and build order**. Decisions: own `abyss_items` entity · embeddings-based clustering (reuse category inference) · Reflection & care voice for the monthly review.

## Conventions (CLAUDE.md)

Drizzle one-table-per-file; `db:generate` → review SQL → commit. RLS on every table → `auth.uid()` (SQL in `supabase/rls/`). Zod inputs on every tRPC proc. Pure utils in `src/lib/`. Sync/offline parity in `packages/db-local` + `packages/sync`. Vitest; typecheck + lint gate.

---

## Phase 6 — Data model

**`abyss_items`** (new `src/db/schema/abyss-items.ts`):

- `id uuid pk`, `user_id uuid`
- `title text NOT NULL`
- `type` enum `idea | task | reference` (default `idea`)
- `note text NULL`, `links jsonb NULL` (array of URLs; images later)
- `category project_category NULL` (optional at capture; reuses the 5-category enum)
- `source` enum `capture | drop` (where it entered)
- `status` enum `active | promoted | archived` (default `active`)
- `resurface_count int NOT NULL default 0`
- `last_resurfaced_at timestamptz NULL`, `last_touched_at timestamptz`, `created_at`, `updated_at`
- `promoted_task_id uuid NULL` → `tasks(id) on delete set null` (set when a task-type item is promoted into a real task); `promoted_target text NULL` (week / project / goal descriptor for non-task promotions)
- `embedding` vector (or stored via the existing inference store) — for clustering
- Indexes: `(user_id, status)`, `(user_id, last_touched_at)`.
- **RLS:** `user_id = auth.uid()`.

**Themes / constellations:** **computed, not a hard table.** Cluster `active` items by embedding similarity at read time (cache results); a lightweight `abyss_themes` row may cache a cluster's AI-generated **label + count** for display. Brightness = `resurface_count`; dimming = age via `last_touched_at`.

**Lifecycle:**

- **Archive:** a periodic check sets `status = archived` after the inactivity threshold (TBD; user-set?). Retrievable; never hard-deleted.
- **Promote:** sets `status = promoted` + links (`promoted_task_id` / `promoted_target`); the item **stays**. If the spawned task is completed or abandoned, the item returns to `active` (a quiet "it came back").
- **Delete:** explicit per-item hard delete (the only true removal).

---

## Phase 7 — AI behavior

- **Embeddings (reuse):** on capture, compute the item's embedding via the **same pipeline as category inference** (local/hybrid model already built in Phase 1). One inference stack, no new infra.
- **Clustering → constellations:** group `active` items by cosine similarity (nearest-prototype, like the category provider). Each cluster = a constellation; the AI summarizes a short **theme label**. Powers the Sky's connected stars + the List's "Keeps calling you."
- **Resurface tracking:** increment `resurface_count` when an item is surfaced in the review, opened, or when a **near-duplicate is captured** (capturing "try gouache" bumps the "watercolor" cluster → "you've parked this 4 times").
- **Category auto-suggest:** the chat-capture path ("park…") and quick-capture reuse category inference to tag `category` (optional, overridable).
- **Monthly review (Reflection & care guide voice):** surfaces **brightest constellations first**, warm and celebratory ("here's what keeps calling you"), never a nag. Read-only resurfacing — no in-the-moment pop-ups (per §10 / §8 reconciliation).

---

## Phase 8 — Integration & build

**Integration:**

- **Drop → Abyss (§6):** the triage "Drop" action creates an `abyss_items` row (`source = drop`, `type = task` default, carries the task's `category`). A separate explicit **Delete** stays true-delete.
- **Capture entry points:** a **global shortcut** (⌘⇧A, TBD) → quick-capture overlay (quick mode default, expandable to full); and the **chat rail** ("park…") via a Claude tool that creates the item and auto-tags type/category.
- **Promotion:** one-tap → target picker (Today / Week / Project / §8 annual goal); spawns/links the target; sets `status = promoted`.
- **Sync / RLS:** `abyss_items` (+ embeddings) mirrored in `packages/db-local` + `packages/sync`; RLS `auth.uid()`.
- **Monthly-review reminder:** via the §15 notification layer (OS on Tauri desktop, in-app on web).
- **Dark theming:** the Abyss uses its own **dark surface tokens** (Design Tokens phase) for both Sky and List.

**Build sub-phase order:**

1. **6A** schema (`abyss_items` + RLS + sync).
2. **8A** capture — quick-capture overlay + chat tool + Drop wiring.
3. **3-List** the List view (switchable grouping, search, category/type/age filters) on dark surfaces.
4. **8B** promotion (target picker + link + status).
5. **7A** embeddings + clustering + resurface tracking.
6. **3-Sky** the Sky view (starfield render, type star-styles, constellations) + **Phase 4 motion** (capture/resurface/promote/archive).
7. **7B** monthly review (Reflection voice, brightest-first).
8. **6B** archive job + the constellation rail icon + dark tokens.
9. **Verify** — Vitest (clustering, resurface, promote-returns), manual QA, typecheck/lint/RLS audit.

**Order rationale:** ship the _useful_ Abyss (capture → List → promote) before the _delightful_ one (Sky + motion). Clustering (7A) gates both the constellations and the review.

## Open (settle during build)

**RESOLVED Jul 1 2026:**

- **Auto-archive:** fixed **~90 days**; no user setting in v1.
- **Taxonomy:** three soft types — **idea / task / reference** (confirmed).
- **Reference capture:** **URLs only** for now (images/rich media later).

**Remaining build polish:** constellation icon's exact 20px form · Abyss dark surface tokens (Design Tokens phase).
