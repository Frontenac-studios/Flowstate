# W10 — The Filter, reframed as an outbound sourcing agent — build plan

_Written 2026-09-01. Authority: [MISSION.md](../MISSION.md) (Filter section — to be rewritten
outbound-first), [v1-scope.md](./v1-scope.md) §W10 + §8f, and the locked product design in the
"Leads & Sourcing" walk-through chapter (memory: v1-ux-walkthrough; artifact
https://claude.ai/code/artifact/d4929025-c00d-4952-849c-609a85e7ef08). This is a build plan; the
**product** design is already locked — the open decisions here are engineering scope + one fork._

**Headline: this is the largest single item in v1 — a mini-product, not a ~24h item.** Honest
range: **~55–60h for the scoring/drafting brain, ~85h for the full autonomous agent.** The tracker's
24h estimate predates the outbound reframe.

---

## 1. Engineering ground-truth (recon against origin/main)

- **AI engine:** OpenRouter via the Vercel AI SDK (`ai` v6), not the Anthropic SDK. Model
  `anthropic/claude-sonnet-5` (env `OPENROUTER_API_KEY`; role tiers chat/structured/fast). `streamText` +
  `generateText` in `src/server/claude/`; provider-neutral **tool-calling works** (`chat-tool-catalog.ts`
  → `buildTools()` → `executeChatTool()`), capped at 5 rounds. Reusable regardless of flags.
- **The HTTP surface is gated:** `/api/claude/*` returns 404 when `FLAGS.chat` is off (default). W10 must
  **not** ride those routes — it needs its own entry point. The underlying `src/server/claude/*`
  primitives are reusable.
- **No web capability, at all.** Every tool is a local DB read/write. No web search, fetch, scrape, or
  enrichment; no such deps. **"Research companies on the web" is net-new capability**, not wiring.
- **No job runner.** One cron only (`vercel.json` → `/api/calendar/sync`, every 10m, `maxDuration=300`,
  Bearer `CRON_SECRET`). No Inngest/queue. A weekly agent = a new cron route on that pattern, and the
  300s ceiling + no queue means a multi-company research run must chunk/fan-out.
- **Structured output** is currently regex-parsed text; a scoring agent should use the AI SDK's
  `generateObject` for score/confidence/rationale robustness.

**Consequence:** the scoring/ranking/drafting **brain** is buildable on existing infra with a manually
provided company (or pasted list). Autonomous **web sourcing** is a separate capability with an external
dependency and new job substrate.

---

## 2. THE fork (the decision that shapes everything)

|                                     | Path A — the brain (manual input)     | Path B — the full autonomous agent                                           |
| ----------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| Sources prospects by                | you add/paste a company or short list | a weekly agent researches the web vs your ICP                                |
| Web dependency                      | **none**                              | web-search/enrichment API (external; vendor TBD)                             |
| Job infra                           | none                                  | new weekly cron + run/batch model + chunking                                 |
| Builds on existing infra            | **yes, entirely**                     | needs net-new web + job layers                                               |
| Lights up applied-line + Week queue | yes                                   | yes                                                                          |
| Est.                                | **~55–60h**                           | **~85h**                                                                     |
| Risk                                | bounded, no external deps             | external dep + the "build infra ahead of proven value" trap MISSION warns of |

**Recommendation: build Path A as v1's W10; cost Path B as a fast-follow** once the brain is proven.
It's immediately useful (score/rank/draft against your ICP; light up the Direction applied-line and the
Week queue), carries no external dependency, and matches v1-scope's own "run the Filter by hand until
you know" (§ line 745). A even has a smaller **A-minimal** cut (see §4) if ~55h is too much now.

---

## 3. Data model (net-new; full migration ritual each — tenancy + RLS + SQLite mirror + sync)

- **`leads`** (`org_shared`) — a scored research artifact, **not** a project (avoids ~5 throwaway
  projects/week). Fields: `id, user_id, org_id, company_name, segment_id, source (sourced|manual|intake), score (0–100), confidence (0–100), rank, rationale (jsonb: fit/risk/strategy + gaps), state (new|contacted|engaged|proposal|promoted|dismissed|snoozed), dismiss_reason, snooze_until, run_id (nullable), project_id (nullable → set on promote), created_at, updated_at`.
- **Promote** (first real contact) creates a `state='prospect'` **project** and links it — that's when a
  lead becomes pipeline. This reconciles the earlier "a lead = a prospect project" lock with the
  reality that most sourced leads are dismissed.
- **`sourcing_settings`** (`org_shared`, own table — like `money_settings`, NOT on `app_settings` which
  is `personal`): jsonb `segments` (2–3 ICP profiles), `firmographics`, `exclusions`, `weights`
  (Fit 40 / Risk 30 / Strategy 30, won-similarity 50/50), `outreach_voice` (warmth/length/signature/
  cite-analogous toggle/voice-sample).
- **Outreach drafts:** `lead_outreach` (opener + 1–2 follow-ups, `status`, `sent_at`) or jsonb on `leads`.
- **Money hazard:** `proposal_amount`/rate-floor are money → a **`financial`-class** home (not on
  `leads`/`projects`, both `org_shared`). Proposal-stage money is light in v1; model it financial-class
  when it lands (overlaps W15's fee table — reuse).
- **Dedup:** on insert, reject/merge against clients, existing pipeline projects, declined/lost,
  parked, and the exclusion ledger.

---

## 4. Phases — Path A (the brain)

Sizes: S <4h · M 4–12h · L 12–40h. **A-minimal** = W10a+b+c+g (~22–26h): ICP + scoring + triage-lite +
the Quarter applied-line, proving the loop; outreach/funnel/Week-queue deferred.

| Phase    | Scope                                                                                                                                                                                                                                                            | ~h  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **W10a** | Data model: `leads` + `sourcing_settings` + `lead_outreach` (+ enums), migrations, tenancy, RLS, SQLite mirror, sync registration                                                                                                                                | ~9  |
| **W10b** | ICP config UI + **auto-seed** from Direction (hard gate) + won-clients (positive examples) + Targets (quarterly lens) + rate (floor); the explicit layer (firmographics, exclusions, weights); outreach-voice profile                                            | ~7  |
| **W10c** | The **scoring brain** (server, `generateObject`): Fit/Risk/Strategy → `score` (0–100) + separate `confidence` (data-coverage); confidence-adjusted ranking with a "high-potential / unverified" callout. Runs on a manually-entered company or pasted list in v1 | ~10 |
| **W10d** | Triage UI: ranked prospect cards (score+confidence, Fit/Risk/Strategy breakdown, reasons, gaps, segment tag); dismiss-with-one-tap-reason, snooze, promote→project; dedup                                                                                        | ~10 |
| **W10e** | Outreach drafting: voice profile → fixed opener skeleton (hook→what-you-do→proof→soft-ask); copy / open-in-mail (no integration v1); 1–2 aging-clock follow-up drafts (Sweep-triggered)                                                                          | ~8  |
| **W10f** | Projects **pipeline** integration: promote→prospect project, the Pipeline lane + stages (Sourced→Contacted→Engaged→Proposal→Signed), close-reason (won/declined/lost), Sweep "drop→lost or delete?"                                                              | ~10 |
| **W10g** | The two seams: Week "Waiting on you" (sourced/follow-up/deal row-types in `steering.ts`/`WaitingOnYouBlock.tsx`) + Quarter **Direction applied-line** (derived count in `directions.list` → `DirectionCard`)                                                     | ~6  |

**Path A ≈ 58h.**

### Path B (autonomous sourcing — the fast-follow)

| Phase    | Scope                                                                                                                                                                                                    | ~h  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **W10h** | Web-research capability: a new AI-SDK `tool()` for web search/fetch (OpenRouter web plugin or a search API), + a research→structured-facts step feeding the brain                                        | ~12 |
| **W10i** | Weekly agent job: new cron-secret route (calendar-sync pattern), `sourcing_runs` batch model, Tuesday + on-demand "source now", batch size 3–10, rollover-with-decay; chunk to respect `maxDuration=300` | ~10 |
| **W10j** | Enrichment behind a **swappable adapter**, web-only in v1 (turn a vendor on per-segment only when confidence runs chronically low)                                                                       | ~4  |

**Path B adds ≈ 26h → full agent ≈ 84h.**

---

## 5. Open questions

1. **The fork (§2): A / A-minimal / full B?** — the decision that sizes everything. _Lean: A (or A-minimal), B as costed fast-follow._
2. **Web capability for B**, when built: OpenRouter web plugin vs a search API vs scraping? (T3 locked "web-only v1, swappable adapter, vendor decided later" — People Data Labs was the recorded lean, not committed.)
3. **`proposal_amount` home** — confirm it lands in a `financial`-class table shared with W15's fee model, never on `leads`/`projects`.
4. **Flag-gate W10 during build?** Recommend a `FLAGS.sourcing` so partial work can merge dark (the feature is large and multi-PR).
5. **MISSION rewrite** — the Filter section is inbound-first; it should be rewritten outbound-first (walk-through thread T6). Docs task, do alongside.
