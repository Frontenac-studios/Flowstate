# Flowstate — W2 build plan: time tracking, Clockify-grade

_Written 2026-08-24. Authority: [MISSION.md](../MISSION.md), [v1-scope.md](./v1-scope.md) §W2,
and [discovery-v1-journeys-and-money.md](./discovery-v1-journeys-and-money.md) (Journey 3,
capture decisions 3.1–3.2). This is a build plan — the phased breakdown and the decisions that
scope it. Where it and `v1-scope.md §W2` disagree on detail, this document is the newer read._

---

## 0. Where W2 sits, and why it's next

W2 is **P2** in the build order and the largest single item in v1. Every number the product
sells — the Budget, the Ledger, invoices, effective rate, the hire trigger — is computed off
this log. It is also the most urgent: with Focus parked (#265) there is currently **no way to
start a timer at all**, so the flow the whole product depends on is offline until W2 lands.

Deps: W1 (#267, merged — clients/rates/`project_id` on projects) and W1.5 (#268 — financial
pipe) are both done and on hosted. W2 unblocks P3 (W3 reporting + W4 invoices — the first
money-positive milestone), P5 (W6 Budget), and the effective-rate layer.

---

## 1. The decision that scopes W2 before a line is written: Q5

The single call that changes W2's size is **open question Q5 / deferral #1** in the discovery
scope ledger: do the two **desktop-only** time features — the menu-bar timer and idle
detection — ship in v1, or move to v1.1?

| Option                              | Size     | What ships                                                                   |
| ----------------------------------- | -------- | ---------------------------------------------------------------------------- |
| **Full W2** (§8c decision Q2 = "A") | ~28–30h  | Everything below, including menu-bar timer and idle detection.               |
| **Split W2** (Q5 lean)              | **~20h** | Everything except menu-bar timer (W2f) and idle detection (W2c-idle) → v1.1. |

The phases below isolate the two cuttable slices (**W2c-idle**, **W2f-menubar**) so the
decision can be taken now or deferred until the in-app timer has been used.

**Recommendation: build the split, but keep the timer-running-long notification** (it is cheap
and load-bearing — the forgot-to-stop error silently corrupts everything downstream). Rationale:
you cannot judge whether a menu-bar timer is needed until the in-app timer has run for a week
(§8e), and idle-trim is the feature most likely to annoy if its heuristics are off.

---

## 2. Phased build

Ordered so each phase leaves the app shippable, and the destructive data phase lands alone,
first, behind its own PR — repeating the W1.5 pattern that applied cleanly.

### W2a — Data reshape + backfill · **M (~6h)** · own PR · the risky one

- `task_time_entries` → **`time_entries`**. `project_id` **NOT NULL**; `task_id` **nullable**;
  add `description` text, `tag_id` nullable FK, `billable` bool (defaults from whether the
  project has a client), `source` (`timer | manual | gap_fill`), `invoiced_at` nullable. Keep
  `started_at` / `ended_at`. **Drop the required `reason`** — replaced by `source`.
- **No `client_id` on the entry.** Client is derived through `project_id`; a second copy drifts
  the moment a project is reassigned.
- `time_tags` (`org_shared`) — a controlled list managed in Settings; free text rejected,
  because a tag is invoice structure and a typo becomes a wrong invoice line.
- **Backfill** (touches real hosted rows): every existing entry takes `project_id` from its
  task; entries whose task has no project land on a named **"Unassigned"** project, never
  dropped. Acceptance = a query returning **0 null `project_id`s**.
- Desktop SQLite mirror gains every column in the same PR; `sqlite-defaults.test.ts` extended.
- **Hosted apply is destructive-adjacent** (column rename + NOT NULL backfill). Hand-write /
  verify the migration to `ALTER TABLE ... RENAME`, never drop+recreate (drizzle-kit's
  generated SQL for renames/enum casts has been wrong before — see W1's 0045). Apply the one
  migration via the Supabase MCP; **never** the batch `apply-drizzle-migrations.cjs` (it would
  re-run 0045 and coerce every `business` project to `personal`).

### W2b — Timer core · **M (~6h)**

- Start = pick project + type description, **no task required**, under 2s. Task links
  optionally (drives estimate-vs-actual in W14).
- **Exactly one timer at a time** — starting a second stops the first and names what it stopped.
- **Start-time authoritative; elapsed computed, never accumulated** — survives quit, sleep,
  network loss, midnight. Test: a timer started before a simulated quit reports correct elapsed
  after restart.
- Timer visible in the Today header while the app is open.
- Rewrites the current `timeEntries.start(taskId)` router (today it _requires_ a task and a
  `reason`) into `start({ projectId, taskId?, description? })` + `stop` + `switch`.

### W2c — Accuracy: idle + gap-fill · **M (~5h)** · idle half CUTTABLE

- **Idle detection** (desktop, needs an OS idle API): 10 min no input → on return "Away 34 min
  — keep or trim?", **trim preselected**, never silent. → **v1.1 candidate.**
- **End-of-day gap-fill** (keep — pure app logic): the close lists untracked spans > 15 min →
  one-click assign to a recent project, or dismiss.
- Manual entry / edit for any past day, accepting `1h15`, `75m`, `1.25` as durations.

### W2d — Threshold notifications · **S–M (~4h)** · needs a new Tauri plugin

- Four native notifications, each at most once per crossing, each individually switchable
  (Law 3): **20h/client** (offers the W4 invoice draft), **timer-running-long** (_keep even in
  the split_), **project over estimate** (only when the project carries one), **weekly hours**
  (rate / delivery-risk framing, once per week).
- **Plumbing gap:** `tauri` has the `tray-icon` feature but **no `tauri-plugin-notification`**.
  This phase adds the Rust plugin + JS capability + permission grant. The web
  `NotificationSettingsSection` already exists to hang the toggles off.

### W2e — Tags UI + CSV export + Clockify cutover · **S (~3h)**

- `time_tags` management in Settings (controlled list).
- CSV of raw entries for any period (date, client, project, task, tag, description, duration,
  billable, invoiced) — **one query path** that also feeds W3 reporting and W4 invoices.
- Clockify cutover (decisions 3.1 / 3.2): import **open unbilled time only** to seed per-client
  carry-forward. Q9 lean: a one-time manual per-project pass at cutover, not an import script.

### W2f — Menu-bar timer · **M (~5h)** · CUTTABLE (v1.1 in the split)

- Tauri tray timer (uses the present `tray-icon` feature): current project + elapsed, one click
  to stop, one to switch. Start/stop/switch only — editing lives in the app.

---

## 3. Rules that hold across the phases

- **Rounding, stated once:** entries are tracked to the second and reported exactly. Rounding
  to 0.25h happens **only** when an invoice line is generated (W4). Never round in storage.
- **One query path:** the same row shape feeds the timer, W3 reporting, and W4 invoices. Do not
  fork a second aggregation.
- **SQLite mirror tax:** every column added here is mirrored in `packages/db-local` in the same
  PR, guarded by `sqlite-defaults.test.ts`, or desktop inserts fail NOT NULL.

---

## 4. Settle before W2b (W2a is decision-independent — it is common to full and split)

1. **Q5 cut line** — full (~28h) or split (~20h)? _Rec: split, keep the timer-running-long
   notification._
2. **The `reason` column** — W2a drops it for `source`; confirm nothing reads `reason` for
   meaning (a grep in W2a) before dropping.
3. **PR shape** — W2a lands as its own PR first (the destructive-migration one), then W2b–W2f.
