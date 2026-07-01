# Kash 3.0 — Backend & Latency Optimization Spec

> **Status:** Decisions locked (Jun 24 2026); build deferred to a **parallel track** (OPT runs alongside the data-spine feature phases, not as a gate). See §6 sequencing.
> **Scope:** App-wide backend/data-architecture pass — sync, indexing, storage shape, the AI/embedding seam, and the create-time latency path. **Not** a feature surface; it changes how the existing surfaces perform, not what they do.
> **Companions:** `kash-3.0-data-spine.md` (schema reality + cross-phase concerns §5, decision log §7), `kash-3.0-plan.md` (§14 data model, §15 system-wide mechanics, §16 sequencing).

---

## 0. Why this exists

The Jun 24 architecture pass (below) found the backend is **structurally sound but carries a few latent cliffs** — most are invisible until a user's data grows or the network blips. This doc records the findings, a phased fix plan, and the UI/UX decisions the fixes touch, so the optimizations can be built **incrementally as each feature phase touches the relevant code** rather than as a separate rewrite.

Two rules govern this doc:

1. **Point-in-time, re-audit on build.** The snapshot in §1 is true as of Jun 24 2026. The codebase is mid-build (data-spine Phase 3 in flight, Phase 4 ahead), so **every OPT item below opens with a re-audit step** (§2) — confirm the current code still matches the finding before changing it. Do not build an OPT item off this snapshot alone.
2. **Plan-only until scheduled.** This is a planning artifact. No code changes ride on this doc until an OPT item is pulled into a PR off its re-audit.

---

## 1. Architecture pass — snapshot (Jun 24 2026)

How Kash is built today, and where the latency/storage risk concentrates.

### 1.1 Shape

- **One codebase, two runtimes.** Web = Next.js 14 (App Router) on Vercel → Supabase Postgres. Desktop = the same Next build wrapped in **Tauri** → local **SQLite** (`better-sqlite3`, WAL) → background sync to Supabase. `src/db/mode.ts` switches runtime; the app is typed as `AppDb` (Postgres) with the SQLite runtime kept compatible.
- **API layer.** tRPC 11 + TanStack Query, single batched endpoint, SuperJSON. ~14 routers; heaviest are `tasks` (CRUD, scheduling, top-3, undo snapshots, category resolution) and `chat`. Supabase SSR auth; **RLS on every table** scoped to `auth.uid()`.
- **Sync (`packages/sync`).** Local-first **outbox + watermark pull**. `sync_mutations` logs every local insert/update/delete as JSON; push replays them to Supabase via RPC upsert with camelCase↔snake_case mapping. Pull uses per-table `sync_watermarks` (`updated_at >= watermark`); conflict = last-write-wins on `updated_at` (remote wins on tie). 12 of 17 tables sync; `focus_blocks`, `chat_custom_suggestions`, `health_checks` are local-only.
- **AI/ML seam.** Split deliberately to stay under Vercel's 5 MB function limit (commits `ce4f9f0`, `28239e7`). Client: live per-keystroke category inference via `@huggingface/transformers` all-MiniLM-L6-v2 (int8, ~23 MB), nearest-prototype cosine, `warmEmbedder()` on mount. Server: create-time category inference + chat via Anthropic SDK (Haiku for category; SSE stream at `/api/claude/stream`, 2-tool / 5-round loop). `onnxruntime-node` excluded from function tracing.

### 1.2 Risk register (highest leverage first)

| #   | Finding                                                                                                                                                       | Where                     | Impact                                                                  | Severity    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------- | ----------- |
| R1  | **Full-table re-pull fallback** — any watermark-pull failure re-downloads every row for the user, no pagination                                               | `packages/sync` pull path | A transient blip becomes a multi-MB, multi-second sync for a heavy user | **Cliff**   |
| R2  | **Sequential mutation push** — N pending edits = N round-trip RPC upserts, no batching                                                                        | `packages/sync` push path | Desktop sync time scales linearly with offline edit volume              | High        |
| R3  | **Unbounded pull payloads** — pull is per-table, no page size; chat history especially                                                                        | pull path + `chat` router | Large threads/histories arrive as one payload                           | High        |
| R4  | **Missing/unconfirmed composite indexes** — sync + RLS lean on `(user_id, updated_at)`; hot reads on `scheduled_date`, top-3, `(thread_id, created_at)`       | Postgres + SQLite schema  | Full scans as row counts grow; cheapest win to fix                      | High        |
| R5  | **Outbox bloat** — `sync_mutations.payload_json` stores a full JSON copy of each mutated row (duplicates large chat content); no prune of confirmed mutations | `sync_mutations`          | Local DB grows unbounded; large-row edits double-store                  | Medium      |
| R6  | **Timestamp precision drift** — Postgres `timestamp` vs SQLite `INTEGER timestamp_ms` across the LWW seam                                                     | schema seam               | Last-write-wins can misfire on near-ties                                | Medium      |
| R7  | **Create-time server inference latency** — `tasks.create` can block ~300–500ms on the Haiku category call                                                     | `tasks` router            | Slow create when category is otherwise unresolved                       | Medium (UX) |
| R8  | **Embedding model cold-load** — ~23 MB model + per-session in-memory prototype rebuild on the web path                                                        | client embedding seam     | First-keystroke category lag on cold cache                              | Low         |

These map 1:1 to the OPT phases in §3.

---

## 2. Re-audit protocol (run at the start of each OPT phase)

Because the code drifts under this doc, **before building any OPT item, confirm the finding still holds.** A quick, fixed checklist:

1. **Locate the code** named in the §1.2 row; confirm the shape described still matches.
2. **Check the data-spine phase state** — has a feature phase already added the table/column/index this OPT item assumes? (e.g. Phase 3 dependencies adds `task_dependencies` — does it already carry the `(user_id, updated_at)` index R4 wants?)
3. **Confirm no regression in scope** — has the finding gotten better (already fixed in passing) or worse (new tables added without the standing requirements in §5)?
4. **Re-confirm the UX decision (§4) still fits** the current surface before touching anything user-visible.
5. Only then open the PR. Record any drift from this snapshot as a dated note in the OPT decision log (§5).

This keeps the optimization honest as the feature build moves under it.

---

## 3. Multi-phased optimization plan

Each OPT phase is independently shippable and slotted to ride a feature phase where possible (§6). Ordered by leverage; **OPT-1 + OPT-2 are the same `packages/sync` code path and should land together.**

### OPT-1 — Sync push batching + bounded pull _(fixes R2, R3; pairs with R1)_

- **Batch push:** collapse the outbox into **one multi-row upsert per table per flush** instead of one RPC per mutation. Preserve mutation ordering where a later edit supersedes an earlier one for the same row (coalesce by row id, keep last).
- **Bounded pull:** page the watermark pull with a **keyset cursor on `(updated_at, id)`**, fixed page size, loop until drained. No table ever arrives as a single unbounded payload.
- **Acceptance:** 100 offline edits flush in O(tables) RPC calls, not O(edits); a large thread pulls in bounded pages.

### OPT-2 — Kill the full-table re-pull cliff _(fixes R1)_

- Replace the "pull failed → re-pull entire table for the user" fallback with the **same keyset-paginated path from OPT-1**, resuming from the last good cursor rather than from zero.
- Watermark only advances on a fully-drained, successful page loop (no partial-advance that silently drops rows).
- **Acceptance:** a forced mid-pull failure resumes from the cursor; no full-table download is ever triggered.

> **OPT-1 and OPT-2 are the urgent pair.** R1 is the only finding that turns a momentary blip into a heavy sync; it shares the push/pull code with R2/R3, so fix them in one PR.

### OPT-3 — Indexing pass _(fixes R4)_

Confirm/add composite indexes on **both** Postgres and the SQLite mirror:

- `(user_id, updated_at)` on **every synced table** (sync + RLS hot path).
- `tasks (user_id, scheduled_date)` and `tasks (user_id, is_top_3, top_3_order)`.
- `chat_messages (user_id, thread_id, created_at)` (also serves OPT-6 windowing).
- Any new table from a feature phase inherits the `(user_id, updated_at)` index as a **standing requirement** (§5, also added to data-spine cross-phase concerns).
- **Acceptance:** `EXPLAIN` shows index use on the sync pull, the top-3 read, and the chat-window read; no seq scans on those paths.

### OPT-4 — Outbox lifecycle + storage shape _(fixes R5)_

- **Prune** confirmed-synced rows from `sync_mutations` on a schedule (or after a successful flush acks them).
- Store **only changed columns** in the mutation payload, not the whole row (esp. for chat content).
- **Acceptance:** outbox size tracks pending count, not lifetime mutation count; a large-field edit doesn't double-store the field.

### OPT-5 — Timestamp/seam normalization _(fixes R6)_

- Pin a single canonical representation for sync-relevant timestamps across the Postgres↔SQLite seam (normalize to ms at the mapper boundary) so LWW comparisons can't misfire on precision.
- **Acceptance:** a round-trip edit (write SQLite → push → pull) preserves ordering; no spurious "remote wins" on a genuine local-newer edit.

### OPT-6 — Latency on the user-facing paths _(fixes R7, R8; UX-touching — see §4)_

- **Create + category (R7):** insert the task row immediately with the client-embedding guess; resolve the sharper server category in the background and patch the row. Composer behavior per **D1 (brief shimmer then settle)**.
- **Chat history (R3/R8 read side):** the chat rail loads a **recent window + load-older** (D3), backed by the `chat_messages (user_id, thread_id, created_at)` index from OPT-3.
- **Embedding cold-load (R8):** serve the model from origin/CDN with long-lived cache headers (never re-fetch from the HF hub per session); keep `warmEmbedder()` truly idle-time (never blocking composer mount). On desktop, persist prototype vectors to SQLite once to remove the per-launch rebuild.
- **Acceptance:** create never blocks on the network; the accent bar settles per D1; chat opens in bounded time on a long thread; second-session keystroke inference is warm.

### OPT-7 — Sync observability _(supports R1/R2; UX-touching — see §4)_

- Surface sync state on desktop per **D2 (status dot + detail panel)**: synced/syncing/offline dot, expandable to last-synced time, pending-mutation count, manual "sync now", recent conflicts.
- **Acceptance:** the panel reflects real outbox/watermark state; manual sync triggers the OPT-1 flush.

---

## 4. UI/UX & product decisions this pass touches

Decided Jun 24 2026. These are the only OPT items that change anything a user sees; the rest (OPT-1..5) are invisible.

- **D1 — Create + category latency → _brief shimmer then settle._** On create, the row appears instantly with the client guess; the accent bar shows a subtle "resolving" shimmer while the server category resolves, then settles to the final color. Honest about the async step, no blocked create. _(Touches §2 composer accent-bar language — `kash-3.0-data-spine.md` 1.4b/1.AIa.)_ **Motion resolved Jul 1 (AN-B7):** the 3px stripe **gently pulses opacity** (breathing-adjacent, `--motion-medium` looped) then cross-fades to the final category color — no sweep, no indeterminate segment. **Sync indicator resolved Jul 1 (AN-B8):** a **slow pulsing dot in the left-nav (sidebar) footer** while the outbox flushes (this is the lightweight always-visible companion to D2's fuller status panel). See `kash-3.0-animation-sweep.md` AN-B7/AN-B8.
- **D2 — Desktop sync visibility → _status dot + detail panel._** A synced/syncing/offline dot, expandable to last-synced time, pending count, manual sync, recent conflicts. Most transparent option; lands as OPT-7. _(New surface — a small settings/status affordance. Fits the desktop shell; must stay low-chrome per the calm principle, collapsed by default.)_
- **D3 — Chat history loading → _windowed + load older._** The chat rail fetches the most recent N messages and infinite-scrolls upward for older. Bounds payload/latency; adds a scroll-to-load interaction. _(Touches §11 AI Companion chat rail — the rail gains an upward load-more affordance.)_
- **D4 — Sequencing → _parallel track._** OPT items are fixed as the relevant feature phase touches that code, not as a blocking pre-phase. _(Touches §16 build sequencing — recorded there as a standing parallel track.)_

**Open (defer to build):**

- ~~D1 shimmer exact motion/duration~~ — **resolved Jul 1** (AN-B7 breathe-then-settle; AN-B8 sidebar-footer pulsing dot).
- D2 panel placement (settings vs shell status bar) — Navigation/shell spec (§4). _(Note: the always-visible sync **dot** now lives in the sidebar footer per AN-B8; the expandable **detail panel** placement is still D2's open question.)_
- OPT-1 coalescing semantics when an offline delete follows an offline update of the same row — confirm at re-audit.

---

## 5. OPT decision log

| ID    | Decision              | Choice                                                                                                                                                                                                                | Date   |
| ----- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| OPT-0 | Pass model            | Point-in-time snapshot (§1) + **re-audit at each phase** (§2); plan-only until scheduled                                                                                                                              | Jun 24 |
| OPT-1 | Sync push/pull        | **Batch push** (one upsert/table/flush, coalesce by row id) + **keyset-paginated pull** `(updated_at, id)`                                                                                                            | Jun 24 |
| OPT-2 | Re-pull fallback      | **Kill full-table re-pull**; resume paginated from last good cursor; watermark advances only on fully-drained success                                                                                                 | Jun 24 |
| OPT-3 | Indexing              | `(user_id, updated_at)` on every synced table (PG + SQLite) + `tasks(user_id, scheduled_date)`, `tasks(user_id, is_top_3, top_3_order)`, `chat_messages(user_id, thread_id, created_at)`; standing req for new tables | Jun 24 |
| OPT-4 | Outbox lifecycle      | **Prune** acked mutations; store **changed columns only** in payload                                                                                                                                                  | Jun 24 |
| OPT-5 | Timestamp seam        | Normalize sync timestamps to **ms at the mapper boundary**; canonical across PG↔SQLite for LWW                                                                                                                        | Jun 24 |
| OPT-6 | Create + read latency | Async category patch (D1); chat windowing (D3); CDN-cached model + persisted prototypes (R8)                                                                                                                          | Jun 24 |
| OPT-7 | Sync observability    | Desktop **status dot + detail panel** (D2)                                                                                                                                                                            | Jun 24 |
| D1    | Composer on create    | **Brief shimmer then settle** (no blocking create)                                                                                                                                                                    | Jun 24 |
| D2    | Sync visibility       | **Status dot + detail panel**                                                                                                                                                                                         | Jun 24 |
| D3    | Chat history load     | **Windowed + load older** (infinite scroll up)                                                                                                                                                                        | Jun 24 |
| D4    | Sequencing            | **Parallel track** (fix-as-you-touch, non-gating)                                                                                                                                                                     | Jun 24 |

---

## 6. Sequencing — parallel track (D4)

OPT runs **alongside** the data-spine feature phases, fixed where each phase touches the code:

- **Now / next PR (urgent):** OPT-1 + OPT-2 + OPT-3 are the high-leverage core (the R1 cliff + its shared push/pull path + the cheap index win). Worth pulling in early even though the track is "parallel," because R1 is a latent cliff. Naturally rides the **Phase 3 dependencies data-layer PR** (3.l) — that PR already adds a synced table (`task_dependencies`) and pg_cron cleanup, so it touches sync + indexing anyway.
- **As-you-touch:** OPT-4/OPT-5 fold into any sync PR; OPT-3 indexes for a new table land **with that table's migration** (now a cross-phase requirement — §7 of data-spine, §5 here).
- **With the surface it serves:** OPT-6 chat windowing (D3) lands with the §11 chat rail work; OPT-6 create-shimmer (D1) lands with the Phase 1 composer / Design Tokens accent-bar work; OPT-7 panel (D2) lands with the desktop shell / Navigation work.

**Standing requirement (added to data-spine cross-phase concerns §5 and plan §14):** every new synced table ships with its `(user_id, updated_at)` index and respects the batched-push / paginated-pull / outbox-prune model from day one — so the optimized backend is the default for all future build, not a retrofit.

---

## 7. What this feeds into the other docs

This spec is the source of truth for the pass; the threads woven into the master docs are:

- **`kash-3.0-plan.md` §14** — schema additions note: indexing standing-req + sync-shape (batched push / paginated pull / outbox prune) as foundations every new table inherits.
- **`kash-3.0-plan.md` §15** — system-wide mechanics: the offline+sync bullet expanded to point here (batching, bounded pull, the killed cliff, the desktop status panel D2).
- **`kash-3.0-plan.md` §16** — sequencing: OPT recorded as a standing parallel track (D4).
- **`kash-3.0-plan.md` §17** — open-questions backlog: the D1/D2 motion/placement and OPT-1 coalescing items.
- **`kash-3.0-data-spine.md` §5** — cross-phase concerns: the `(user_id, updated_at)` index + sync-shape standing requirements.
- **`kash-3.0-data-spine.md` §7** — decision log: OPT/D rows mirrored.
- **`kash-3.0-build-breakdown.md` §5** — added to the document set.
