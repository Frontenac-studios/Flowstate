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
4. **Chat to the right rail** _(done — shipped in phase 3)_ — `ChatRail` mounts in
   the shell (collapsed default, remembered per session via `kash.chat.railOpen`);
   `BottomDock` is chat-free. Note: `FocusLayout` keeps its own `ChatProvider` +
   `ChatRail` by design — it renders standalone (not nested under `AppShell`), so
   this is deliberate distinct focus-mode chrome, not a duplicate mount.
5. **Contextual Inbox panel** _(done)_ — `InboxPanel` now lives in an in-flow,
   collapsible `ContextualInbox` strip at the top of the content column, mounted on
   Today/Week/Plan; `⌃I` is scoped by virtue of the component only mounting there.
6. **Retire `BottomDock`** _(done — folded into phase 5)_ — deleted; `pb-24`
   reclaimed in `PlanSurface`. (Unread badge was already chat-only, in `ChatRail`.)
7. **Reusable in-page switcher** _(done)_ — shared presentational `InPageSwitcher`
   (glass pill, `aria-pressed`, arrow-key nav). Backs Today's Day/Week and, for
   real consolidation, the Projects view-mode and Gantt-zoom toggles; Plan
   (Month/Quarter/Year) and Care (Walks/Breathing/Reflections) carry wired stub
   switchers until those surfaces have content. Callers keep their own state, so
   `PlanProvider`'s TTL/Monday persistence is untouched; no URL-param view state.
   Left bespoke: the `TaskDetail` priority selector (a rating) and `CategoryFilter`
   (distinct colored-pill styling).
8. **Header = context only + global actions** _(done)_ — header was already
   nav-free (`AppHeader`); `⌘K` palette and `⌘D` (Decide → Focus) confirmed live.
   Chat toggle moved from `⌃J` to `⌘J` to sit with the `⌘`-family; the shortcuts
   modal's stale "⌘K toggles chat" entry was corrected.
9. **Polish** _(done)_ — scope set to Tauri parity (no dedicated mobile-web UX).
   Narrow viewport uses the icon-only rail (already overlays on hover) and the
   `ChatRail` becomes a right-side overlay drawer (scrim + Esc) below `lg` instead
   of a third column. Tauri: header is a `data-tauri-drag-region`; `is-desktop`
   is now actually applied (`DesktopRuntimeFlag` mounted in the root layout) and
   keys a top inset so the macOS traffic lights clear the rail. Accessibility pass
   over the shell surfaces.

## Open (non-blocking) follow-ups

- Final icons for Plan/Abyss/Care.
- Whether `⌃I` (inbox) should also move to the `⌘`-family for full consistency —
  it is currently the lone Ctrl binding.
- Desktop vibrancy: `is-desktop` is wired but no vibrancy/gradient-swap CSS exists
  yet; revisit if we want the native NSView material to show through.
- `FocusLayout` (the `/today/focus` chrome) doesn't share the shell, so its
  drag-region / traffic-light inset parity is still pending.
- A real mobile-web layout (bottom tab bar) if phone support becomes a goal.
