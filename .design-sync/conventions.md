# Flowstate — how to build with this design system

Flowstate (product name **Kash**) is a keyboard-first daily-planning and consulting-money
app. Its look is **flat-calm black-and-white**: pure-white surfaces on a medium gray tray
canvas, hairline borders, near-black ink, and colour reserved for three jobs only —
life-area categories, crimson for irreversible danger, and the Abyss's dark page.

## 1. Setup and wrapping

There is **no theme provider**. Every token is a plain CSS custom property on `:root`,
so any component styles correctly as soon as `styles.css` is loaded — nothing needs
wrapping.

Two exceptions:

- **Toasts** need `ToastProvider` above them; it owns the stack, the dismiss timer and
  the `document.body` portal. `useToast()` throws without it — `useOptionalToast()`
  returns `null` instead.
- **`Tooltip` and `RitualSheet` portal to `document.body`.** They position themselves
  `fixed`; don't try to contain them.

Light theme only — there is no dark mode outside the Abyss. Do not add
`@media (prefers-color-scheme: dark)` rules.

## 2. The styling idiom: Tailwind mapped onto tokens

Style with Tailwind utilities. **Almost every utility you need resolves to a
`var(--token)`** through the preset, so prefer the named utility over an arbitrary
value, and never write a raw hex.

| Concern           | Use these                                                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surface           | `bg-surface` `bg-surface-2` `bg-canvas` `bg-bg`                                                                                                                                                 |
| Active / selected | `bg-active-surface` `bg-active-raised` `border-active-raised-border`                                                                                                                            |
| Border            | `border-border` `border-subtle` · `border-emphasis` (the 1.5px stroke)                                                                                                                          |
| Ink               | `text-ink` `text-ink-muted` `text-ink-faint`                                                                                                                                                    |
| Accent (= black)  | `bg-accent` `text-accent` `hover:bg-accent-hover` `text-accent-on` `bg-accent-soft`                                                                                                             |
| Danger            | `text-critical` `bg-critical`                                                                                                                                                                   |
| Category          | `bg-cat-professional` `bg-cat-personal` (also `cat-relationships`, `cat-adulting`, `cat-body-mind`). The `business` category reuses the professional blue — there is no `cat-business` utility. |
| Radius            | `rounded-card` (14) `rounded-row` (8) `rounded-control` (5) `rounded-chip` (5) `rounded-pill`                                                                                                   |
| Elevation         | `shadow-surface` (in-page objects) `shadow-overlay` (modals, popovers, toasts)                                                                                                                  |
| Type              | `text-micro` `text-caption` `text-meta` `text-body` `text-subtitle` `text-title` `text-h1`                                                                                                      |
| Icon box          | `h-icon-sm w-icon-sm` … `-md` `-lg` `-xl`                                                                                                                                                       |
| Layout rhythm     | `gap-stack` `gap-section` `gap-shell` · `px-card-x` `py-card-y`                                                                                                                                 |
| Shell widths      | `w-nav-rail` `w-nav-rail-expanded` `w-chat-rail` `h-nav-item` `h-kash-row`                                                                                                                      |
| Stacking          | `z-base` `z-sticky` `z-overlay` `z-modal` `z-toast`                                                                                                                                             |
| Motion            | `duration-micro` `duration-short` `duration-medium` `duration-long` · `ease-enter` `ease-move` `ease-exit`                                                                                      |

**The stock Tailwind type scale is overridden**, so `text-xs`/`text-sm`/`text-base`/
`text-lg`/`text-xl` are _not_ the Tailwind defaults — they are 13/17/19/22/30px and track
the token scale. `text-sm` is body text here, not small text.

For one-off spacing the app writes the token inline: `px-[var(--space-4)]`,
`gap-[var(--space-2)]`. The scale is `--space-0` 2px through `--space-8` 32px.

Two app-level classes worth knowing: `kash-focus-visible` (the standard two-ring focus
treatment — put it on any custom interactive element) and `text-balance`.

## 3. Composition rules this system actually enforces

- **Primary actions are outlines, not fills.** `<Button>` defaults to a 1.5px ink
  border on a transparent background. A filled button means destructive.
- **Colour is semantic, never decorative.** Icon-led first; crimson (`--status-critical`)
  only on irreversible paths; category colour only for life areas.
- **Flat, not glassy.** `shadow-surface` is a whisper. Active states are carried by
  `--active-raised-border`, not by shadow. `--kash-glass-*` names still exist as
  back-compat aliases that resolve flat — don't reach for them in new work.
- **No dead ends.** An empty surface uses `ColoredEmptyInvitation` (or
  `EmptyPlanState`), which says what would go there.
- **Keyboard first.** Reach for `KeyCap` / `ShortcutHint` rather than describing a
  shortcut in prose.
- **Reuse `InPageSwitcher`** for any in-page segmented toggle instead of writing tabs.

## 4. Sizing and width

Controls do **not** set their own width, and `Button` does not set font-size — this repo
has no `tailwind-merge`, so `cn()` only concatenates and a caller's class wins on source
order alone. Pass width and type size in through `className`
(`<Input className="w-80" />`, `<Button className="text-xs">`). Two utilities for the
same property will both land; order decides.

## 5. Where the truth lives

- `styles.css` and its `@import` closure — this is everything a rendered design gets.
  It pulls in `fonts/fonts.css` and `_ds_bundle.css`.
- `_ds_bundle.css` carries the full `:root` token block — 235 custom properties inlined
  from the repo's `tokens.css` and `glass.css`, comments intact. Find it by searching the
  file for `Kash 3.0 — Design Tokens`. **That block is the source of truth for every
  value in this system** — read it before inventing one. The `--kash-*` block right after
  it is back-compat aliases that resolve to the flat tokens above.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage notes.
- `components/<group>/<Name>/<Name>.d.ts` — the prop contract.

## 6. A worked example

```jsx
<section className="rounded-card border border-border bg-surface px-card-x py-card-y shadow-surface">
  <header className="flex items-center justify-between gap-[var(--space-3)]">
    <h2 className="text-title text-ink">This fortnight</h2>
    <InPageSwitcher
      ariaLabel="Ledger scope"
      options={[
        { value: "said", label: "Said" },
        { value: "spent", label: "Spent" },
      ]}
      value={scope}
      onChange={setScope}
    />
  </header>

  <ul className="mt-[var(--space-5)] divide-y divide-[var(--border-subtle)]">
    {tasks.map((t) => (
      <li key={t.id} className="flex items-center gap-[var(--space-3)] py-[var(--space-2)]">
        <TaskPriorityIndicator priority={t.priority} reserveSpace />
        <span className="flex-1 text-body text-ink">{t.title}</span>
        <Button variant="ghost" className="text-xs">
          Move
        </Button>
      </li>
    ))}
  </ul>
</section>
```
