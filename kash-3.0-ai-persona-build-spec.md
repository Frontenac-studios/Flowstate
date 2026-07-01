# Kash 3.0 — AI Persona Layer: Build Spec (subsections 6–8)

> Engineering spec for the AI persona layer. Persona definitions, registers, proactivity/autonomy, and the About-me doc (subsections 1–5) are resolved in `kash-3.0-plan.md` §11. This doc covers the **tool/action catalog, architecture, and integration/build**.
>
> **Anchoring decisions:** one neutral Kash with three implicit registers (Planning / Focus / Reflection) · minimal proactivity · **conservative autonomy** (suggest = auto, every state change = confirm) · **capable agent** (can do anything, including deletes) via a **confirm-card pattern**.

## Current state (verified)

- `src/server/claude/system-prompts.ts` — one "Kash" voice; functional modes `companion | narration | eod | weekDraft`.
- `src/server/claude/chat-tools.ts` — `CHAT_TOOLS` with **2 tools** (`query_tasks`, `reschedule_tasks`) + `executeChatTool` dispatch.
- Chat rail, focus chat, nudges, week-draft, EoD generation already exist.

So this layer = **refactor (one voice → register-tuned) + expand (2 tools → a catalog) + add (About-me context + confirm-card writes).**

## Conventions (CLAUDE.md)

Zod inputs on every tool/proc; `import "server-only"` for server logic; no secrets client-side; tests in Vitest; typecheck + lint gate. Tools that change data must be **confirmable** (see architecture).

---

## Subsection 6 — Tool / action catalog

**Two tiers:** **reads & drafts = auto** (no confirm); **writes = confirm-card** (Kash proposes → you approve → applied). No hard limits — deletes allowed, just confirmed.

**Reads / drafts (auto):**

- `query_tasks` _(exists)_ — find/list tasks by filter.
- `query_state` — Today / Week / balance / Top-3 / recent completions (read context).
- `query_projects`, `query_abyss` — read projects/phases; search the void.
- `draft_week`, `draft_eod`, `draft_balance_pass` — produce a **proposal** (not applied) for the user to confirm.

**Writes (confirm-card):**

- Tasks: `create_task`, `edit_task` (title/category/priority/due/recurrence/dependency), `reschedule_tasks` _(exists)_, `complete_task`, `delete_task`.
- Planning: `set_top3`, `apply_week_draft`, `set_protected_block`, `set_day_priorities`, `apply_balance_suggestions`.
- Projects: `create_project`, `edit_phase`, `move_task_to_phase`, `replan_project_dates`.
- Abyss: `capture_to_abyss`, `promote_abyss_item`, `archive_abyss_item`, `delete_abyss_item`.
- Memory: `propose_about_me_edit` _(mechanism deferred — §13)_.

Each write tool returns a **proposed change**, not an immediate mutation (see architecture). Per-register exposure: Planning sees planning/project/task tools; Focus sees a minimal set (narrate, complete, park); Reflection sees review/win/abyss-review tools.

---

## Subsection 7 — Architecture

**System prompts (refactor `system-prompts.ts`):** one **shared base** ("You are Kash, a calm, neutral planning companion…") + a thin **register tone modifier** (Planning = crisp/operational · Focus = minimal/non-distracting · Reflection = slightly warmer). Map existing modes: `companion → Planning`, `narration → Focus`, `eod → Reflection`; add `weeklyReview` / `monthlyReview` Reflection variants. **Register chosen by surface**, never user-selected, never surfaced.

**Context assembly (per turn):** base + register tone + **About-me doc** (once it exists) + **live state** (reuse `fetch-plan-context` / `fetch-week-draft-context`) + the register's tool subset.

**Confirm-card pattern (the key mechanism):** state-changing tools do **not** mutate directly. The model calls a write tool → the server returns a **structured proposed action** → the chat UI renders a **confirm card** ("Reschedule 3 tasks to Thu? · Confirm / Edit / Dismiss") → on confirm, the client calls the apply mutation. This makes "Kash can do anything" safe by construction, and the confirm card **is** the transparency (no separate activity log).

**Memory:** About-me doc stored per user (hybrid: structured sections + free-form notes), read into context each turn; edits go through `propose_about_me_edit` → confirm. _(Update mechanism deferred — §13.)_

---

## Subsection 8 — Integration & build order

**Integration:** fold into the existing chat rail (Planning), focus chat (Focus), nudges, week-draft, and EoD (Reflection). Essential proactive nudges only: stalled Top-3, self-care/walk prompts, the monthly Abyss/Planning review.

**Build sub-phases:**

1. **7A** Refactor `system-prompts.ts` → shared base + register tone modifiers; select register by surface.
2. **7B** Context assembly: inject About-me doc (when available) + live state into every turn.
3. **6A** Expand `chat-tools.ts`: add the read tools + the write tools as **proposed-action** returns.
4. **7C** Confirm-card UI in the chat rail (render proposal → Confirm/Edit/Dismiss → apply).
5. **6B** Per-surface tool wiring (Today / Week / Plan / Projects / Abyss / Reviews).
6. **8A** Essential proactive nudges (minimal).
7. **Verify** — Vitest (tool dispatch, proposal→apply, register selection), manual QA (confirm flow, deletes), typecheck/lint.

**Order rationale:** voice (7A–B) and the confirm-card spine (6A, 7C) come before breadth (6B) — get _one_ write working end-to-end through a confirm card before adding twenty tools.

## Confirm-card UX (resolved Jul 1)

- **Affordance → inline in the chat thread.** A proposed write renders as a confirm card **inline in the chat rail**, directly below Kash's message (Confirm / Edit / Dismiss). Non-blocking, conversational; the card **is** the transparency (no separate activity log, no modal for routine writes). _(If a future destructive-action guard is wanted, a modal is the natural escalation — but the default and the delete path are both inline for now.)_
- **Multi-task proposals → one grouped card.** A proposal that touches several tasks renders as a **single card** listing each affected task with a **per-row toggle**; the user confirms the (sub)set at once (e.g. "Reschedule 3 tasks → Thu", untick one, "Confirm 2"). Not one card per change.
- **Focus register → silent auto-apply.** Focus exposes only its **minimal, reversible** tools (narrate · complete · park) and applies them **silently — no confirm card**. Anything beyond that set is simply **not exposed** in Focus, so there's nothing to confirm mid-session. Keeps Focus near-silent by construction. (Broader writes happen in the Planning/Reflection registers, where the inline confirm card applies.)

## Open

- **About-me update mechanism** (§13) — circle back.
