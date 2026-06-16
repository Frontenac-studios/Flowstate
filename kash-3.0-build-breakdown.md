# Kash 3.0 — Build Breakdown & Spec-Maturity Tracker

> Companion to `kash-3.0-plan.md`. This is the **working checklist** for finishing the spec and building. It answers two questions: _what recurring decisions does every feature need?_ and _which parts are nearly done vs. which need focused breakdown?_

---

## 0. The core distinction (read this first)

So far we've decided the **product-direction layer** — the hard, mostly-irreversible _forks_ (one nav model, strict-MECE categories, recurrence architecture, tiered-autonomy AI, the day-timeline model, etc.). That's the expensive-to-change stuff, and it's largely done.

What remains splits into two very different kinds of work:

- **Product decisions** — forks that still change _what gets built_, and that only you can make (e.g., how the garden grows, the year-view shape). These need **focused sessions**.
- **Spec detail** — mechanical, derivable specifics (schemas, component props, empty/error states, microcopy, AI prompt text). These I can **draft for you to review** — they don't need a decision meeting.

Most features are now **concept-complete but spec-incomplete.** The trick is to spend your decision energy only where a real product fork remains, and let the rest be drafted.

---

## 1. The recurring spec dimensions

These are the **subsections that recur in every feature build** — the predictable places a decision or a draft is needed before a feature is "done." Use them as a checklist against any feature.

| #   | Dimension                     | The question it answers                                                |
| --- | ----------------------------- | ---------------------------------------------------------------------- |
| 1   | **Data model**                | What tables/fields/relationships and migrations does it need?          |
| 2   | **Placement & IA**            | Where does it live in nav, what route, what sub-views (switcher)?      |
| 3   | **Core flows & interactions** | What are the primary actions — create, edit, drag, keyboard, complete? |
| 4   | **Visual & components**       | Layout, which components it reuses vs. needs new, how it looks.        |
| 5   | **AI behavior**               | Which mode acts here, what it does, autonomy tier, prompts/tools.      |
| 6   | **States & edge cases**       | Empty / loading / error / overflow / conflict / first-run.             |
| 7   | **Integration**               | Category, balance, time-tracking, Abyss, notifications, sync/RLS.      |
| 8   | **Motion**                    | Animations and transitions (the final, app-wide pass).                 |

Two dimensions are deliberately deferred app-wide: **#4 colors/tokens** (the Design Tokens phase) and **#8 motion** (the animation pass). So for most features, "fully spec'd" means dimensions 1–3, 5–7 are nailed, with 4 and 8 finished globally later.

---

## 2. Maturity matrix

Per feature: are the **product forks** decided, and is the **build spec** implementation-ready? Then — what's the nature of the remaining work?

**Legend:** ✅ done · 🟡 partial · 🔴 open · ⬛ already built in code

| Feature               | Product forks | Build spec | Remaining work is mostly…                                                                   |
| --------------------- | ------------- | ---------- | ------------------------------------------------------------------------------------------- |
| §4 Navigation         | ✅            | 🟡         | **Spec detail** (component spec, mobile/Tauri pattern, route naming)                        |
| §2 Life Categories    | ✅            | 🟡         | **Spec detail** (migration/backfill, label confirm) + colors in tokens                      |
| §14 Task & Data Model | ✅            | 🟡         | **Spec detail** (field-level schema, RRULE, override edge cases)                            |
| §11 AI Companion      | ✅            | 🔴         | **Mixed** — product (mode identity, About-me format) + heavy spec (prompts, tool catalog)   |
| §6 Today              | ✅            | 🟡         | **Spec detail** (Calendar component, escalation timing, states)                             |
| §7 Week               | ✅            | 🟡         | **Spec detail** (protected-block UX, threshold model)                                       |
| §8 Planning Mode      | 🟡            | 🔴         | **Product decisions** — year-view shape, bingo layout, balance-pass source, goal data model |
| §9 Projects           | ✅ (core ⬛)  | 🟡         | **Product** (templating engine) + spec detail                                               |
| §10 The Abyss         | ✅            | 🔴         | **Mixed** — product (cadence, expiry, capture entry) + spec (pattern logic, data model)     |
| §12 Self-Care / Care  | 🟡            | 🔴         | **Product decisions** — garden growth model + art, breathing UX, reflection design          |
| §13 Values & Context  | 🟡            | 🔴         | **Product** (values ranking, About-me editing UX) — small                                   |
| §5 Design Tokens      | 🟡            | 🔴         | **Product decisions in progress** — aesthetic, palette/accent, theming, then scales         |
| §15 Mechanics         | 🟡            | 🔴         | **Mixed** — product (web-reminder fallback) + spec (delivery + gamification engine)         |
| Animation pass        | ⚪            | ⚪         | Not started — final phase                                                                   |

---

## 3. Where things actually stand

### Nearly complete — concept locked, remaining work is spec detail I can draft

These need **no more decision sessions** (beyond tiny confirmations). I can write the build spec and you review:

- **§4 Navigation** — shell, rail, routes, migration all decided.
- **§2 Life Categories** — model, strictness, source, balance metric decided.
- **§14 Task & Data Model** — recurrence, dependencies, time-tracking architecture decided.
- **§6 Today** — timeline model, Top-3, DND, self-care interleave decided.
- **§7 Week** — protected blocks, balance viz, over-commit decided.
- **§9 Projects** — core is built; similarity/templating/nesting direction decided (templating _engine_ is the one deeper sub-spike).

### Needs focused breakdown — real product forks still open

These deserve their own **focused decision sessions**, broken into subphases:

- **§5 Design Tokens** _(in progress)_ — finish: aesthetic direction · category palette + accent · light/dark/night → then type, spacing, elevation, and a component inventory. _Unblocks every other feature's visual layer, so finish this first._
- **§8 Planning Mode** — the heaviest net-new surface. Subphases: (a) year-view shape (needs a mockup), (b) bingo-card layout + completion/reward link, (c) the balance-pass mechanics (suggest from backlog, Abyss, new tasks, or all), (d) goals/intentions data model.
- **§12 Care / the garden** — subphases: (a) garden growth model + art direction (a design spike of its own), (b) breathing-exercise UX + visualization, (c) reflection-ritual design, (d) stats/metrics spec, (e) reminder scheduling rules.
- **§11 AI persona layer** — subphases: (a) the three modes' personas + when each triggers + visual identity, (b) the About-me doc format + how the AI proposes edits, (c) the tool/action catalog (what the AI can actually _do_ per surface).
- **§10 The Abyss** — subphases: capture entry point · review cadence · pattern-detection rules · promotion UX · expiry. (Smaller than the above.)
- **§13 Values & Context** — subphases: values ranking model · About-me editing UX. (Small; rides on §11's About-me decision.)
- **§15 Mechanics** — mostly settled by reference; the one open product fork is the **web-reminder-when-closed fallback**.

---

## 4. Recommended order of remaining sessions

1. **Finish Design Tokens (§5)** — in progress; unblocks all visual work.
2. **Planning Mode (§8)** — biggest open surface; do it as 4 subphase mini-sessions (year-view → bingo → balance-pass → data model).
3. **Care / garden (§12)** — second-biggest; subphase it (growth model + art is its own spike).
4. **AI persona layer (§11)** — modes, About-me format, tool catalog.
5. **Abyss (§10) + Values (§13)** — quick focused passes.
6. **Spec-detail drafting** _(I draft, you review)_ — Data model schemas, Today/Week component specs, Projects templating engine, Navigation component spec.
7. **Animation pass** — last, page by page.

---

## 5. How to use this with the plan

- `kash-3.0-plan.md` = the **spec** (what each feature is and the forks decided so far).
- This file = the **map of what's left**, so you can "check for completeness" before building any feature.
- A feature is **build-ready** when dimensions 1–3 and 5–7 (§1 above) are ✅ in its plan section, with colors (§5) and motion (animation pass) handled globally.
