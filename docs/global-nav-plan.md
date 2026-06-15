# Global Navigation — Implementation Plan

Implements §4 of `kash-3.0-plan.md`: a coherent three-column app shell
(left nav rail · content · right chat rail), with the bottom dock retired and
inbox/triage made contextual.

## Locked decisions

- **Route naming:** Today → `/today`; long-horizon Plan owns `/plan`.
- **Shell strategy:** extend the existing `PlanLayout` into a shared shell and
  migrate routes onto it incrementally (vs. a big-bang route-group rewrite).
- **Chat rail default:** collapsed on load, open/closed state remembered per session.

## Starting reality (June 2026)

- Three divergent layouts: `PlanLayout` (Today/Week/Settings — uses `BottomDock`
  - `LeftNavRail`), `ProjectsLayout` (Projects — bespoke header, **no left rail**),
    `FocusLayout` (Focus — already renders the right `ChatRail`).
- `ChatRail` already exists and is proven in `FocusLayout`.
- Chat + inbox state lives in `ChatProvider` (`railOpen`, `⌃J`) and `BottomDock` (`⌃I`).
- `LeftNavRail`: 3 items + Settings, no grouping, no hover labels.
- New routes needed: `/plan` (Planning), `/abyss`, `/care`.

## Phases

Each phase is independently shippable and leaves the app working.

1. **Route restructure & redirects** — `plan/` → `today/` (+ `/today/focus`); add
   stub routes `/plan`, `/abyss`, `/care`; redirect `/plan*` → `/today*`; sweep all
   internal links (`ProjectsLayout`, `FocusLayout`, `LeftNavRail`, `CommandPalette`,
   any `router.push`).
2. **Left nav rail upgrade** — grouping (Do now / Reflect & plan / pinned Settings),
   new items (Plan/Abyss/Care), collapsible hover labels.
3. **Unify the shell** — generalize `PlanLayout` into `AppShell`; move plan-only
   providers/runners to the Today page; migrate this-week/settings/projects + new
   routes onto it; delete `ProjectsLayout`.
4. **Chat to the right rail** — mount `ChatRail` in the shell; collapsed default,
   remembered per session; remove chat from `BottomDock`.
5. **Contextual Inbox panel** — extract `InboxPanel` from `BottomDock` into an
   in-content panel mounted only in Today/Week/Plan; scope `⌃I` accordingly.
6. **Retire `BottomDock`** — delete it; reclaim `pb-24`; reconcile unread badge.
7. **Reusable in-page switcher** — one segmented control; replace the hardcoded
   Day/Week toggle; apply to Today / Plan / Care.
8. **Header = context only + global actions** — strip nav from header; wire `⌘D`
   (Decide → Focus), confirm `⌘K` palette, decide chat-toggle keybinding.
9. **Polish** — mobile/Tauri parity for the rail; `accessibility-review` pass.

## Open (non-blocking) follow-ups

- Final icons for Plan/Abyss/Care.
- Whether `⌃I` stays a keybinding once inbox is contextual.
- Chat toggle: keep `⌃J` or align to `⌘`-family.
- Narrow-width rail: bottom tab bar vs. icon-only.
