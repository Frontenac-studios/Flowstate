# Manual QA — Bingo Goals AI coach

Covers the goals-coach feature (Phases 1–3). Run before shipping, and after any change to
the goals surface, register, tools, or the confirm/apply path.

## Setup

- Set `KASH_BINGO_COACH_ENABLED=1` and a valid `ANTHROPIC_API_KEY` in `.env.local`.
- Ensure the local Postgres schema is current (the coach reads/writes `chat_messages`,
  `goals`, `bingo_cards`, `app_settings`). If `chat.list` / `settings.get` throw
  "Failed query", apply pending Drizzle migrations to local Postgres first.
- Open `/plan` → **Goals** horizon.

## Scenario 1 — New user, empty card

1. Start a card. The intro shows two on-ramps only: **Talk to your coach** and **Start
   blank** (no "brain-dump", no "guided"). If the coach is disabled/unconfigured, only
   **Start blank** appears.
2. Choose **Talk to your coach** → the grid + the **Goals coach** dock render side by side.
   The dock reads "Goals coach · Shape your year, one goal at a time" with a greeting.
3. Send: "I want this year to be about running and seeing family more."
   - ✅ The coach **asks a question or two first** — it does not dump a list.
   - ✅ Tone is warm/curious, **not** operational or task-manager-like.
4. Continue until it proposes a goal. Expect a **confirm card** ("Add 1 goal to your card").
   - ✅ Suggested goals are **binary** ("Run a 10k", not "get fitter"), **no** milestones,
     dates, or recurring/habit language.
   - ✅ A goal the coach is confident about arrives pre-tagged with a category; an
     ambiguous one arrives **untagged** and **Add to card is disabled until you pick a
     category**.
5. Confirm → the goal lands in the next empty square on the grid; the balance legend updates.
6. Undo (session undo) → the goal is removed from the grid.

## Scenario 2 — Returning user, filling gaps

1. On a draft card with several goals and an empty category, open the coach.
2. Ask for help filling gaps.
   - ✅ The coach **nudges toward the thin category with a human question** ("is there
     someone you'd like to grow closer to this year?") — it never recites counts.
   - ✅ It does **not** re-suggest goals already on the card.
3. Leave and return (reload) → the conversation **persists** (one thread per card year).

## Scenario 3 — Boundaries

1. Ask: "break this goal into weekly steps / tasks."
   - ✅ The coach **warmly declines and points you to Plan** — it does not produce
     milestones, sub-tasks, or a schedule.
2. Confirm the coach never surfaces one of your existing **tasks** as a goal (tasks are
   excluded from its context by design).

## Gating / degradation

- **Coach off** (`KASH_BINGO_COACH_ENABLED` unset): the dock is absent; onboarding shows
  **Start blank** only; the grid works normally.
- **No API key**: same as above (the flag implies configured).
- **Finalized card**: the dock is **hidden** entirely; only the locked grid shows.
- **Backend/API error**: the dock shows "Couldn't reach Claude — try again. Retry" and does
  not crash.

## Automated coverage (already in CI)

- `src/lib/planning/goal-guardrails.test.ts` — binary / recurring / length rejection.
- `src/lib/chat/proposed-actions.test.ts` — `propose_bingo_goals` schema, `mergeBingoGoalEdits`,
  headline, 80-char cap.
- `src/server/claude/chat-tools.test.ts` — goals surface exposes only goal tools (no task tools).
- `src/server/claude/system-prompts.test.ts` — goals surface selects the Socratic register.
- `src/lib/chat/threads.test.ts` — goals thread id round-trip + schema.

## Not yet automated (follow-up)

- Behavioral/prompt-regression evals for tone, asks-first, no-milestones, and the
  breakdown-redirect (needs an LLM eval harness).
