# Kash 3.0 — Values & Context Spec

> The build spec for §13 (Account, Values & Personal Context) of `kash-3.0-plan.md`. Decided in the
> Values & Context session (Jun 22 2026). The "About me" doc architecture is **shared with §11 (AI
> persona)** — this spec owns the user-facing layer. Companions: `kash-3.0-plan.md` (§13, §11).

---

## 0. Shape

One **editable "About me" doc** is the umbrella (V2-5). It holds four sections — **Values · Work ·
Life · Constraints** — mixing headed structure with free prose. It's the transparent, user-controlled
record of everything the AI knows, and the source the AI reads for prioritization and planning.

```
About me  ▸  Values (core set)  ·  Work  ·  Life  ·  Constraints
```

---

## 1. Decision log

| #    | Decision               | Choice                                                                                                                       |
| ---- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| V1-1 | Values: ranked vs flat | **Flat set** (no hierarchy) — **RESOLVED Jul 1 2026**                                                                        |
| V1-2 | Values: selection      | **Hybrid** — curated suggestions + write-your-own                                                                            |
| V1-3 | Values: count          | **3–7 range** (a "core values" set, not a strict Top 5)                                                                      |
| V1-4 | Values: usage scope    | **All three** — goal/task value-tag + AI weights & explains aligned suggestions + values-check                               |
| V1-5 | Values: home           | **A values card** (the Values section of the About-me doc)                                                                   |
| V1-6 | Values: editing        | **Anytime + a gentle yearly review** prompt                                                                                  |
| V2-1 | Doc structure          | **Mixed** — headed sections with free prose inside                                                                           |
| V2-2 | Doc content source     | **Both** — you write + AI proposes additions (ghosted-accept, §9 of planning-mode)                                           |
| V2-3 | Edit retroactivity     | **Future only** — edits apply going forward; past/current untouched — **RESOLVED Jul 1 2026**                                |
| V2-6 | About-me update UX     | **Hybrid** — Settings ghosted accept/reject rows + chat confirm-card; direct edit always available — **RESOLVED Jul 1 2026** |
| V2-4 | Provenance             | **Always show source** on AI-learned facts (where/when it learned it)                                                        |
| V2-5 | Doc scope              | **Umbrella** — Values + Work + Life + Constraints are sections of one doc                                                    |
| V3-1 | Constraints captured   | **Hours + recurring commitments + preferences**, all as structured rows                                                      |
| V3-2 | Hard vs soft           | **Two tiers** — hard = never scheduled over; soft = avoided when possible                                                    |
| V3-3 | Constraint consumers   | **Scheduling + notifications/DND** now; reserved-day + capacity later                                                        |

---

## 2. V-1 · Values

- A **flat set of 3–7 core values** (no ranking). Chosen via a **hybrid** picker: a curated list of
  common values to spark, plus write-your-own.
- **Used three ways:**
  1. **Tag** — **goals only in v1** (`goals.value_id`, PM1-2); no `tasks.value_id` column (RESOLVED Jul 1 2026).
  2. **AI leans on them** — the AI weights value-aligned suggestions and **explains** why
     ("suggested — it serves Health, one of your values"). **Values nudge + explain** — urgency can still win when deadlines demand it (RESOLVED Jul 1 2026).
  3. **Values check** — a balance-style scan flags values getting little attention
     ("Adventure's been quiet this quarter"); surfaced in the Check-in (PM-7).
- **Home:** a **values card** = the Values section of the About-me doc (V2-5).
- **Editing:** anytime, with a gentle **yearly review** prompt (alongside the new Bingo card).

## 3. V-2 · The About-me context doc

- **Structure:** **mixed** — headed sections (Values, Work, Life, Constraints) with free prose inside;
  readable to a human and parseable by the app.
- **Content source:** **both** — you author freely, and the AI **proposes** additions it learns:
  - **Settings** — ghosted accept/reject rows (§9 pattern); you can always edit directly.
  - **Chat** — chat-initiated edits via confirm-card (`propose_about_me_edit`).
  - **RESOLVED Jul 1 2026** (hybrid update mechanism).
- **Retroactivity:** **future only** — editing the doc shapes suggestions going forward; it does not
  rewrite past or silently recompute current plans. (Resolves the §13 open question.)
- **Provenance:** AI-learned facts **always show their source** inline ("learned from your calendar,
  Aug") so memory is trustworthy and correctable.
- **Transparency principle:** this doc _is_ the AI's memory — nothing the AI "knows" lives outside it;
  the user can read, edit, and delete any of it.

## 4. V-3 · Constraints (a section of the doc)

- **Captured as structured rows:** **working hours**, **recurring commitments** (gym Tue/Thu, school
  run), and **preferences** (mornings = deep focus). Captured by the user and/or AI-proposed (V2-2).
- **Two tiers:** **hard** (never schedule over — e.g. school run) and **soft** (avoid when possible —
  e.g. no meetings after 3pm).
- **Honored by (now):** **Scheduling** (Week/Today won't place focus work over a hard block; avoids
  soft ones when it can) and **notifications/DND** (quiet outside working hours / during commitments).
  **Later:** reserved-day suggestions (PM4-3) and the capacity model (PM1-12) consume them too.

---

## 5. Data-model implications (draftable)

- `values` — `user_id`, `label`, `source` (curated | custom), `created_at`. Flat (no rank); 3–7 enforced app-layer.
- `about_me_sections` / items — section (values | work | life | constraints), free-prose body, plus
  structured items where applicable; per AI-added item: `author` (user | ai), `source_text`,
  `learned_at` (provenance).
- `constraints` — `type` (hours | commitment | preference), schedule/spec, `severity` (hard | soft),
  `author`, provenance. (May be the structured items of the Constraints section.)
- Value link: `goals.value_id` (already from PM1-2, nullable). **No `tasks.value_id` in v1** (RESOLVED Jul 1 2026).
- Edits are **non-retroactive** by contract (no recompute of past/active on save).

## 6. Integration & cross-feature

- **AI (§11)** reads the About-me doc as its memory; weights value-aligned suggestions, explains via
  values, and respects constraints. The doc's ghosted proposals reuse §9.
- **Planning Mode (§8):** goal value-link (PM1-2); the values-check rides the Check-in (PM-7);
  constraints later feed reserved-day (PM4-3) + capacity (PM1-12).
- **Scheduling + §6/§15:** constraints drive placement + auto-DND now.

## 7. Open / deferred

- ~~AI persona update mechanism~~ → **RESOLVED Jul 1 2026** — hybrid Settings + chat confirm-card (see V2-6).
- Values-check cadence/placement detail → rides the **PM-7 Check-in**.
- Reserved-day + capacity honoring constraints → wired when those build (§8 build deps).
