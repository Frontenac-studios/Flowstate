# Kash 3.0 — Global Nav: Phased Implementation Plan

> Grounded in the actual code (read-only audit, Jun 25). The codebase is **ahead of the plan doc**: routes are already split, the chat rail is already collapsed-by-default with a mobile drawer, and the bottom dock is gone. So this is mostly **reconcile-to-spec**, not build-from-scratch. **No code changed yet — awaiting permission.**

## What's already done in code (verified)

- **Routes split:** `/today` (Today) and `/plan` (Plan) already exist as separate routes — the old `/plan` collision is **already resolved**. No migration needed.
- **Grouped rail:** `LeftNavRail.tsx` already groups "Do now" (Today · This Week · Projects) + "Reflect & plan" (Plan · Abyss · Care) + Settings pinned; expand-on-hover with per-session pin persistence (`nav-rail-storage.ts`).
- **Chat rail:** `ChatRail.tsx` is **collapsed by default**, persists open/closed per session (`chat-rail-storage.ts`), is an **inline column at `lg`** (= push panel) and an **overlay drawer on narrow widths** with Esc-to-close. This already matches the "push panel + mobile drawer" decisions.
- **Bottom dock retired**, `⌘K` command palette present (`CommandPalette.tsx`, `AppHeader.tsx`).
- **Icons** are hand-rolled inline SVGs in `LeftNavRail.tsx` (no icon library) — so the new set is a path swap, **no new dependency**.

## Gaps vs. the finalized spec (what this plan implements)

| #   | Gap                                                      | Where                                                 |
| --- | -------------------------------------------------------- | ----------------------------------------------------- |
| 1   | Rail icons are the old set                               | `LeftNavRail.tsx` SVG consts                          |
| 2   | Active item must render as the **soft-gray pill**        | `LeftNavRail.tsx` (`--kash-accent-soft`) + token swap |
| 3   | No **"Ask Claude" chip** + no `⌘/` toggle                | `AppHeader.tsx`, chat toggle hook                     |
| 4   | Label "This Week" vs spec "Week"; route `/this-week`     | rail + route _(decision needed)_                      |
| 5   | Settings layout → **top tab bar**                        | settings layout component _(audit)_                   |
| 6   | **Bingo** must be a Plan sub-tab, never a rail item      | `PlanHorizonView` _(when built)_                      |
| 7   | Left-nav **mobile hamburger drawer** (confirm/implement) | `LeftNavRail.tsx`                                     |

---

## Phases (each = one small PR; CI green; conventional commits; no `--no-verify`)

### Phase 0 — Audit & confirm (read-only, no PR)

Verify the three unknowns before touching code: (a) the current chat-toggle keybinding, if any; (b) the Settings layout component (already tabs, or a left-nav to convert?); (c) the left-nav's actual narrow-width behavior; (d) grep for any remaining internal links assuming Today lives at `/plan`. Output: a short confirmation note; adjust phases if reality differs.

### Phase 1 — Rail icons + active-state pill

Swap the 7 inline SVGs to the chosen set (sun · calendar-days · folder · compass · sparkles · sprout · sliders) and ensure the active item reads as the soft-gray pill. The pill is token-driven (`--kash-accent-soft` → `#f1f1f2`, active text → ink), so this **pairs with the B&W token swap** (§5). Pure visual; low risk. _Verification: screenshot rail in each state._

### Phase 2 — Chat toggle: "Ask Claude" chip + `⌘/`

Add the soft-gray "Ask Claude" chip to `AppHeader` (top-right, every page) wired to the existing chat-open state; bind **`⌘/`** to toggle the rail (keep `⌘K` for the palette). Decide whether the current key (if any) stays as a secondary alias. _Verification: chip opens/closes the push panel; `⌘/` works; no collision with `⌘K`/`⌘D`._

### Phase 3 — Label/route reconcile ("Week")

Per the decision below: rename the rail label "This Week" → "Week" (and optionally the route `/this-week` → `/week` with a redirect). Update `match` patterns. _Verification: active highlighting still resolves; old links redirect._

### Phase 4 — Settings → top tab bar

Convert the Settings layout to a horizontal top tab bar (active tab = inset-white pill), tabs: Account · Categories · About me · Notifications · Preferences · AI / Kash · Data & sync. _Verification: tabs switch sections; keyboard reachable (a11y)._

### Phase 5 — Mobile left-nav hamburger drawer

If Phase 0 shows the left nav doesn't already collapse to a drawer on narrow widths, add the hamburger → slide-in grouped drawer (mirroring the chat rail's existing drawer pattern). _Verification: drawer opens/closes; desktop rail unaffected._

### Phase 6 — Bingo as a Plan sub-tab (reserve the hook)

No Bingo code exists yet. Ensure the Plan horizon switcher (`PlanHorizonView`) reserves Bingo as the 5th tab (Week·Month·Quarter·Year·Bingo) and that nothing adds Bingo as a rail item. Full Bingo build is a separate feature; this phase only protects the placement decision. _(Could be deferred to the Bingo feature build.)_

---

## Sequencing & conventions

- Order: **0 → 1 → 2 → 3 → 4 → 5 → 6.** Phases 1–2 deliver the most visible change; 1 should land with (or just after) the B&W token swap so the pill renders correctly.
- Each phase is an independent PR per CLAUDE.md (typecheck/lint/test/build green; Zod on any new input; one default export/file; match existing patterns).
- No new dependencies (icons are inline SVG).

## Open questions — RESOLVED (Jun 25)

1. **"Week" naming:** **label only** — rename rail label "This Week" → "Week"; keep the `/this-week` route (no redirect). _Phase 3 simplifies to a one-line label + `match` change._
2. **Chat keybinding:** **`⌘/` only** — single toggle key (Phase 0 still confirms/removes any existing binding).
3. **Bingo:** **deferred** to the future Bingo feature build — this plan only guards the decision (no rail item); the 5th Plan tab gets wired when Bingo is built. _Phase 6 drops to a guardrail note, not active work._
4. **Phase 1 packaging:** **fold** rail icons + active-pill into the broader **B&W token-swap PR** (the pill is token-driven). No separate nav-only PR.

## Final phase list (post-decisions)

- **Phase 0** — audit & confirm (read-only). ✅ done — code was ahead of the doc (routes split, chat collapsed + mobile drawer, bottom dock gone, B&W tokens already in `tokens.css`).
- **Phase 1** — rail icons + soft-gray active pill. ✅ **committed** (`feat(nav): swap rail icons…`). Added `--surface-selected:#f1f1f2`.
- **Phase 2** — "Ask Claude" chip + `⌘/` toggle. ✅ **committed** (`feat(chat): ask-claude chip…`; rebound from ⌘J; updated shortcuts modal).
- **Phase 3** — rename label "This Week" → "Week" (label only). ✅ **committed** (`feat(nav): rename rail label…`).
- **Phase 4** — Settings → top tab bar (7 tabs, placeholders for unbuilt). ✅ **committed** (`feat(settings): top tab bar…`).
- **Phase 5** — mobile left-nav hamburger drawer. ✅ **committed** (`feat(nav): mobile hamburger drawer…`). Desktop rail now `hidden lg:block`; a header hamburger (`lg:hidden`) dispatches a window event; the drawer mirrors ChatRail's scrim/Esc/close-on-navigate pattern. Shared `NavSections` extracted.
- **Phase 6** — _guardrail only:_ keep Bingo out of the rail; wire the Plan tab during the Bingo build. (deferred)

**Status (Jun 25): Phases 1–5 implemented & committed, typecheck + lint clean, pre-commit hooks passed.** Vitest couldn't run in-sandbox (native-binary arch mismatch) — run `npm test` locally. Six commits stacked on `main`, HEAD on `feat/projects-index-bw-progress`. Only Phase 6 (deferred to the Bingo build) remains in this plan.
