# W17 — Global capture hotkey + task search — build plan

MISSION desktop pillar 2 ("a thought becomes a captured item in under two seconds, from
anywhere, without switching windows"). Called out in `docs/v1-scope.md` §9 audit as a
capability with no W-item. This doc gives it one.

Search rides along because the capture panel is the natural home for "did I already write
this down?", and the ⌘K palette already has the input and the keyboard loop.

---

## 1. Engineering ground-truth (recon against origin/main, 2026-09-03)

- `tauri-plugin-global-shortcut` is **not** a dependency. `Cargo.toml` has `tray-icon`,
  `shell`, `notification`, `window-vibrancy`. Nothing registers an OS-level key.
- `capabilities/default.json` scopes permissions to `"windows": ["main"]`. A second window
  needs its own capability entry or every `core:window:*` call from it is denied.
- The tray menu already has `"capture" => open_main_window(app, port, true)`, which navigates
  the **main** window to `plan_url(port, focus_composer = true)`. That is option B, already
  built. W17 replaces the surface, not the intent.
- The desktop app is a Tauri shell over a Next sidecar on `127.0.0.1:4310`. A capture window
  is a second `WebviewWindowBuilder` pointed at `http://127.0.0.1:4310/capture` on the **same
  origin**, so it should inherit the Supabase auth cookie. Unverified. See §3.
- In-app capture today: `AbyssQuickCapture` (⌘⇧A) writes to `abyss_items` via
  `trpc.abyss.create`. `CommandPalette` (⌘K) filters eight hardcoded commands, no data.
- The line parser is already extracted and framework-free: `src/lib/parser/parse-quick-input.ts`
  (`parseQuickInputLines` → title, date, project slug, priority, category, tags, recurrence,
  warnings) plus `ParsePreviewChips` for the chip row. The panel reuses both as-is.
- `src/lib/tasks/detect-duplicate-task-warnings.ts` exists and is the closest thing to search
  in the repo today.
- No `search` procedure anywhere. `tasks.listIncomplete` / `listByProject` are the only
  broad task reads.

---

## 2. Decisions locked (Kat, 2026-09-03)

| Question        | Decision                                                                     |
| --------------- | ---------------------------------------------------------------------------- |
| Surface         | **Floating panel.** Second borderless window, Flowstate never comes forward. |
| Shortcut        | **⌘⇧K**, rebindable in Settings.                                             |
| Landing spot    | **Toggle in the panel**, Backlog / Today, remembers the last choice.         |
| After save      | **⏎ saves and closes. ⇧⏎ saves and stays open** for the next line.           |
| Fields          | Line + toggle, **plus inline `;` syntax** with parsed chips.                 |
| Result action   | **⏎ on a found task opens it in the app**, highlighted.                      |
| Search scope    | Open tasks, task notes, completed tasks (ranked last), projects and clients. |
| Search surfaces | Capture panel, ⌘K palette, Backlog filter, project detail filter.            |

Not in scope: launch-at-login (this feature's twin, its own item), a global shortcut for
anything other than capture, search over time entries or invoices.

---

## 3. The spike that gates everything (W17a · S · 1h)

**Does a second Tauri window on the same sidecar origin share the logged-in session?**

Build a throwaway second `WebviewWindow` at `/today`, open it from a tray item, and see
whether it renders authenticated or bounces to `/login`.

- **Shares the cookie** (expected): proceed with the plan below.
- **Does not share it**: the panel cannot be its own window as designed. Fallback is a
  frameless _always-on-top_ main window in a "panel" mode (resize + reposition + strip chrome
  on capture, restore on open), which is uglier but needs no second session. Decide then,
  do not build both.

Nothing else starts until this returns an answer.

---

## 4. Slices

### W17b — Register the shortcut · S (2h)

- `npm install`-free: add `tauri-plugin-global-shortcut = "2"` to `Cargo.toml`, register in
  `lib.rs`.
- On registration failure (another app holds the combo), do not crash and do not silently
  swallow: set a flag the web app can read and surface in Settings.
- Handler calls `open_capture_panel(app, port)`; for now that just logs.
- Acceptance: ⌘⇧K from Gmail writes a line to the shell log with Flowstate in the background.

### W17c — The panel window · M (4h)

- New route `src/app/(capture)/capture/page.tsx` in its own route group, no AppShell, no nav,
  transparent body.
- `open_capture_panel`: create-or-show a `capture` window, 560×64 at rest, borderless,
  `always_on_top`, `skip_taskbar`, no decorations, centered on the **active** monitor.
- Second capability file scoped to `"windows": ["capture"]`.
- Esc or blur hides the window (never destroys it — recreating costs the webview boot).
- After save, `hide()` then let macOS return focus to the previous app.
- Acceptance: ⌘⇧K from Gmail shows the bar in under 400ms with the cursor in the field, Esc
  returns focus to Gmail with Gmail's scroll position intact.

### W17d — Capture, with the toggle and the parser · M (4h)

- Reuse `parseQuickInputLines` + `ParsePreviewChips`. Chips render under the field as you type.
- Backlog / Today toggle, persisted to `localStorage`, mirrored into the panel's placeholder
  copy so the target is visible without reading the toggle.
- Backlog → `abyss.create` (type `task`, source `capture`). Today → `tasks.create` with
  `scheduledDate` = today, or whatever the parsed line says.
- ⏎ saves and hides. ⇧⏎ saves, clears the field, keeps the panel open with a running list of
  what was just captured beneath it.
- Offline: the sidecar and SQLite are local, so this works with no network. Verify explicitly.
- Acceptance: five captures in a row via ⇧⏎ land in the right place; a line with
  `; gw ; friday ; !!` parses to project, date and priority.

### W17e — One search procedure · M (3h)

- `src/trpc/routers/search.ts`, one procedure `search.query({ q, limit, kinds })`.
- Postgres `ILIKE` over `tasks.title`, task notes, `projects.name`, `clients.name`, scoped by
  `ctx.userId`. At 15 projects and low-thousands of tasks this is correct and fast; tsvector
  is a later optimization, not a v1 requirement (build-vs-buy rule).
- Ranking: title prefix > title contains > note contains; open before completed; recent
  before old. Completed tasks always below open ones.
- Pure ranking logic goes in `src/lib/search/rank-results.ts` with unit tests, per the
  `src/lib` no-framework rule.
- Acceptance: a title query returns in under 150ms locally; a completed task never outranks
  an open one with the same match quality.

### W17f — The four call sites · M (4h)

1. **Capture panel** — results appear under the field as you type. ⏎ on a highlighted result
   opens the main window at that task (see below) instead of creating.
2. **⌘K palette** — typed rows (Task / Project / Client / Go to) with the existing keyboard
   loop. Commands stay pinned above data results when the query is empty.
3. **Backlog** — in-place filter box over the loaded list.
4. **Project detail** — same filter, scoped to that project.

Deep link: opening a task from the panel calls a shell command that shows the main window and
navigates to `/today?task=<id>` (or the project page when the task is not on today), with the
row highlighted for ~2s. One helper, both call sites use it.

### W17g — Settings: rebind + failure surface · S (2h)

- A shortcut recorder in Settings that captures a chord, checks registration, and persists it.
- If registration failed at launch, Settings says so in plain words and offers a rebind. This
  is the only place the feature is allowed to speak.
- Acceptance: rebinding to a combo another app holds shows the failure rather than appearing
  to work.

---

## 5. Estimate

| Slice | What                      | Size |
| ----- | ------------------------- | ---- |
| W17a  | Session-sharing spike     | 1h   |
| W17b  | Register the shortcut     | 2h   |
| W17c  | The panel window          | 4h   |
| W17d  | Capture + toggle + parser | 4h   |
| W17e  | The search procedure      | 3h   |
| W17f  | Four call sites           | 4h   |
| W17g  | Settings rebind           | 2h   |
|       | **Total**                 | 20h  |

Capture alone (a–d, g) is 13h and ships standalone. Search (e–f) is 7h and ships standalone.
Either half is a coherent PR.

## 6. Flag

Behind `FLAGS.capturePanel`, following the W10 `sourcing` precedent: this ships across several
PRs and the half-built panel should not be reachable in a build. Flip on when W17d lands.

## 7. Open questions

- Does ⌘⇧A (in-app quick capture to Abyss) survive, or does the panel replace it? Leaning
  keep both until the panel has been used for a week, then delete the loser.
- Launch-at-login is this feature's twin and is still unscoped. A hotkey for an app that is
  not running does nothing.

---

## 8. Build log — 2026-09-03

**Landed (commit `feat(capture): the global capture hotkey`)**: W17b, W17c, W17d, W17g and the
autostart fold-in. Branch `feat/w17-capture-hotkey`, worktree `../flowstate-w17`, cut from
`origin/main` rather than the dirty `feat/projects-3.2-flow` tree, which touches
`CommandPalette.tsx`, `AppShellOverlays.tsx`, `QuickInput.tsx` and six settings components — every
file W17f will need. Rebase W17f onto that branch after it merges, or expect the conflicts.

**W17a, the session-sharing spike, was folded into the build rather than run first.** Tauri v2 on
macOS gives every webview in the app the same WKWebsiteDataStore unless one is configured
explicitly, and the panel loads the same `127.0.0.1:<port>` origin as the main window, so the
Supabase cookie should carry. If `/capture` bounces to `/login` on first run, that assumption was
wrong and §3's fallback applies: a frameless always-on-top _main_ window in panel mode.

**Not verified from the build session** — the container is Linux, the app is a macOS Tauri build,
and `node_modules` is a symlink to a macOS install:

- `cargo check` — never run. The Rust is written against Tauri 2 APIs from documentation.
- `Cargo.lock` — not updated. The first `npm run tauri dev` resolves the two new crates.
- `eslint`, `vitest` — both need platform-native binaries (rolldown, esbuild).
- The app itself.

`tsc --noEmit` passed clean, which covers the TypeScript half.

**Manual verification, in this order:**

1. `npm run tauri dev`, and watch the Rust compile. The two new crates download on this run.
2. `/capture` renders the bar rather than bouncing to `/login` — this is W17a's answer.
3. ⌘⇧K from another app shows the bar without Kash coming forward.
4. Esc returns focus to that app, with its scroll position intact.
5. A plain line saves to Backlog; ⇧⏎ saves and keeps the panel open.
6. `; gw ; friday ; !!` parses to project, date and priority with the Today toggle on.
7. Settings → Preferences shows the chord, rebinds it, and reports a taken chord honestly.
8. Quit Kash, press ⌘⇧K, confirm nothing happens — then turn on launch at login.

**Deliberately not built here:** search inside the panel (W17e–f). The panel has no results rows
yet, so ⏎ always creates.

---

## 9. Search build log — 2026-09-03

**Landed**: W17e and W17f, on the same branch, rebased onto local `main` (`18c7d49`, which is one
unpushed commit ahead of `origin/main`).

**Two things the recon changed:**

- **Tasks have no notes column.** The "task notes" search scope can only mean Backlog item notes
  and client notes, which is what shipped. If task-level notes are wanted, that is a schema change
  and its own item.
- **The Backlog filter already existed.** `AbyssFloatingBar` has a search input and
  `filterItems` in `src/lib/abyss/grouping.ts` already matches title _and_ note. Nothing was built
  there; the fourth call site was already done.

**Shipped:**

- `src/lib/search/rank-results.ts` — pure ranking with 9 tests. Bands: exact title, title prefix,
  word prefix, title contains, body contains, with completed rows demoted a full band so they stay
  findable but never outrank live work. Ties break recency, then title, so the list doesn't
  reshuffle between keystrokes.
- `search.query` — one procedure over task titles, Backlog titles and notes, project names, client
  names and notes. `lower(x) LIKE lower(y)` rather than `ILIKE`, because the desktop build runs
  these same queries against SQLite. `%` and `_` are escaped, so a query containing them doesn't
  match everything.
- Capture panel: matching tasks and Backlog items under the field, ↑↓ to move, ⏎ on a highlighted
  row opens it in the main window instead of creating a duplicate.
- ⌘K palette: commands and data rows in one keyboard loop, commands pinned above results.
- Project detail: a task finder that filters the board's already-loaded tasks and, on pick, selects
  the phase path so the Miller columns walk down and reveal it (`phasePathForTask`, 5 tests).

**Known gap:** result hrefs carry `?focus=<id>`, and nothing reads that parameter yet. Selecting a
task from the palette lands you on the right page but does not highlight the row. That is a small
follow-up in Today and the project board, not a redesign.

**Still unverified from this session**, same reasons as §8: `cargo check`, `eslint`, `vitest`, and
the app. `tsc --noEmit` is clean. The 14 new unit tests have never been executed — run
`npm run test` on the Mac before trusting the ranking.
