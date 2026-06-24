# Kash 3.0 — Claude Project Setup Kit

Use this to continue the planning from your phone in the Claude app.

## Set it up (≈2 min)

1. **Claude app → Projects → New project.** Name it "Kash 3.0 Planning."
2. **Add to project knowledge** — upload these four files (they're the source of truth):
   - `kash-3.0-plan.md` — vision + every feature area + open questions
   - `kash-3.0-build-breakdown.md` — maturity tracker (what's decided vs needs work)
   - `kash-3.0-data-spine.md` — the decision log
   - `kash-3.0-data-spine-build-spec.md` — the implementation spec (Phases 1–4)
   - _(Light option: upload just this file — the status + backlog below are enough to work the decisions, though Claude will have less depth.)_
3. **Paste the Custom Instructions** (below) into the project's instructions field.
4. **Start a chat with the Kickoff Prompt** (below).

## Two caveats on mobile / in a plain Project

- **Rich interactive mockups** (the visual widgets I've been showing you) are a desktop‑Cowork feature. In a normal Project, Claude will sketch options in text/markdown instead — still useful, just not rendered.
- **Claude in the Project can't edit your local files.** It'll keep a running decision log _in the chat_. When you're back at your desk, bring those decisions to a Cowork session to fold into the docs — or ask it to "output an updated decision-log snippet I can paste."

---

## Custom Instructions (paste into the Project)

> You are my product‑planning thinking partner for **Kash 3.0** — a whole‑life, ADHD‑friendly planning app built around five MECE life categories (Professional, Personal Projects, Relationships, Adulting, Body & Mind). The project‑knowledge files are the source of truth; read them for current state and past decisions before answering.
>
> **Working method — follow strictly:**
>
> - **Ask clarifying questions before planning or speccing.** There's almost always context that makes the output better. Seek clarity; leave every decision to me.
> - **Never assume anything I haven't explicitly named.** If a plan needs a choice I haven't made, surface it as an open question instead of guessing. If you catch yourself assuming, strip it out and ask.
> - **Present options with honest tradeoffs, neutrally.** You may note a suggestion, but the decision is mine.
> - **Work a few questions at a time, in focused rounds** — not all at once.
> - **Define any jargon** you use; I won't always know the terms. Teach where useful.
> - **When we discuss UI or structure, show a concrete example** (sketch in text/markdown if richer rendering isn't available).
> - **Record decisions as we go:** keep a running decision log in the chat. When I ask, output an updated snippet I can paste back into the docs.
> - **Be concise and direct.**
>
> **Guardrails:** the five categories are fixed (rename/recolor only). Foundational decisions already in the data‑spine decision log are settled — don't reopen them unless I ask.

---

## Kickoff Prompt (send to start a session)

> Continuing Kash 3.0 planning from my phone. Read the project files for where we are. First, list the open areas still needing decisions (from the docs), recommend which to tackle first and why, and ask me to confirm. Once I pick, walk me through it one question‑round at a time — don't assume, define any jargon, and keep a running decision log I can paste back later.

---

## Current status (snapshot — Jun 2026)

- **Built:** the pre‑existing engine (Today loop, Week, Projects, time‑tracking capture, AI chat/nudges); the navigation shell; and **Phase 1 — Category on tasks** (enum→`body_mind`, `category` NOT NULL, AI resolver, settings editor, composer accent bar, task‑row stripe, backfill). `/abyss` and `/care` exist as empty shells.
- **Spec'd, not built:** Phase 2 (time‑tracking aggregation + weekly review), Phase 3 (task dependencies).
- **Decided, not yet spec'd:** Phase 4 (recurrence) sub‑phases; the 3 Daily Wins build.
- **Needs decision sessions:** Design Tokens (finish), Planning Mode, Care/garden, The Abyss, AI persona layer, Values & Context, system Mechanics, Animation pass — plus the decided‑but‑unbuilt new Today/Week UX.

## Open‑decisions backlog (good order to run through on mobile)

1. **Finish Design Tokens** — aesthetic direction, category palette + accent, light/dark, then type/spacing/elevation scales. _(Unblocks all visual work.)_
2. **Phase 4 — Recurrence** — write the 4A–4x sub‑phase build spec (decisions already locked).
3. **3 Daily Wins** — detection taxonomy + build spec (product decisions done).
4. **Planning Mode** — year‑view shape, bingo‑card layout, the balance‑pass source, goal data model.
5. **Care / the garden** — growth model + art direction, breathing UX, reflection rituals, stats.
6. **The Abyss** — capture entry, review cadence, pattern detection, promotion path, data model + UI.
7. **AI persona layer** — the three modes, the About‑me doc format, the tool catalog.
8. **Values & Context** — ranking model + About‑me editing UX.
9. **System Mechanics** — web‑reminder fallback, the shared notification + gamification engine.
10. **New Today/Week UX build specs** — day Calendar living‑record, balance bar, protected blocks, etc.
11. **Animation pass** — last, page by page.
