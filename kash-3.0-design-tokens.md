# Kash 3.0 — Design Tokens Spec

> The implementation spec for §5 (Design System & Visual Language) of `kash-3.0-plan.md`.
> All decisions below were made in the Design Tokens session (Jun 22 2026). This doc is build-ready:
> hand it to a build session to replace the legacy `kash-*` glass tokens in `src/styles/glass.css`
> + `tailwind.config.ts`. Companions: `kash-3.0-plan.md` (§5), `kash-3.0-build-breakdown.md` (§5).

---

## 0. Decision log

| #     | Decision         | Choice                                                                                                                              |
| ----- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| DT-1  | Aesthetic        | **Flat calm** — solid surfaces, no glassmorphism/blur                                                                              |
| DT-2  | Accent           | **Neutral graphite** — all saturation reserved for category meaning                                                                |
| DT-3  | Category palette | **Apple set**: Blue=Professional · Purple=Personal Projects · Red=Relationships · Orange=Adulting · Green=Body & Mind · Yellow reserved |
| DT-3b | Semantics        | **Icon-led + graphite**; color used only for genuinely critical alerts                                                             |
| DT-4  | Theming          | **Light only** for v1; tokens structured so a dark theme drops in later without rework                                             |
| DT-5a | Density          | **Compact** (~30px rows, 13px base text)                                                                                           |
| DT-5b | Typeface         | **Figtree**                                                                                                                        |
| DT-5c | Surface finish   | **Crisp + structured** — 8px cards / 5px rows, firm border, no shadow (one shadow token for overlays only)                          |
| DT-6  | Components       | Canonical inventory locked (24 components, ~13 net-new) — see §7                                                                   |

---

## 1. Aesthetic (DT-1)

Flat calm. Solid opaque surfaces, hairline/firm borders, no backdrop-blur, no translucency,
no gradients. Depth comes from a subtle background→surface value step and borders, **not** shadow
(the lone exception is overlays — see Elevation). This retires the `glass-panel*` material language
and the `--kash-glass-*` token family.

The product logic: a neutral canvas (DT-1) + graphite chrome (DT-2) makes the **category color the
only saturated thing on screen**, so the eye goes straight to "which life area."

---

## 2. Color tokens (DT-2, DT-3, DT-3b)

### 2.1 Neutrals & accent — light theme

```css
:root {
  /* surfaces */
  --bg:           #f5f6f8;   /* app backdrop */
  --surface:      #ffffff;   /* cards, panels */
  --surface-2:    #f7f8fa;   /* row fill, inset */
  /* borders (firm, per DT-5c) */
  --border:        #dcdfe5;  /* default firm border */
  --border-subtle: #e7e9ee;  /* dividers, low-emphasis */
  /* ink */
  --ink:        #1f2430;     /* primary text */
  --ink-muted:  #6b7280;     /* secondary text, meta */
  --ink-faint:  #9aa0ad;     /* hints, disabled */
  /* accent = graphite (DT-2) */
  --accent:        #2b3140;  /* primary buttons, active, links */
  --accent-hover:  #3a4150;
  --on-accent:     #ffffff;
  --focus-ring:    rgba(43,49,64,0.35);
}
```

### 2.2 Category palette (DT-3)

Five life areas mapped to the Apple set. Each category exposes three tokens: a **fill** (light tint
for pills / selected backgrounds), a **solid** (the stripe, dot, balance-bar segment — the Apple hex),
and **text** (a darkened shade for text on the fill, meeting AA on the light fill). Yellow is reserved
(not a category) for status/highlight use.

```css
:root {
  /* Professional — Blue */
  --cat-professional-fill:  #e5f5fc;
  --cat-professional-solid: #009ddc;
  --cat-professional-text:  #0a6a93;
  /* Personal Projects — Purple */
  --cat-personal-fill:  #f4e8f4;
  --cat-personal-solid: #973d97;
  --cat-personal-text:  #6e2c6e;
  /* Relationships — Red */
  --cat-relationships-fill:  #fce8e9;
  --cat-relationships-solid: #e03a3e;
  --cat-relationships-text:  #962427;
  /* Adulting — Orange */
  --cat-adulting-fill:  #fdeede;
  --cat-adulting-solid: #f6821f;
  --cat-adulting-text:  #9a4e08;
  /* Body & Mind — Green */
  --cat-body-mind-fill:  #ecf6e8;
  --cat-body-mind-solid: #61bb47;
  --cat-body-mind-text:  #3a7026;
  /* Reserved — Yellow (status/highlight, never a category) */
  --reserved-yellow-fill:  #fff4dc;
  --reserved-yellow-solid: #fcb827;
  --reserved-yellow-text:  #8a5a14;
}
```

Enum mapping (the DB `project_category` values → tokens):

| Enum value      | Category          | Token prefix          |
| --------------- | ----------------- | --------------------- |
| `professional`  | Professional      | `--cat-professional-*`|
| `personal`*     | Personal Projects | `--cat-personal-*`    |
| `relationships` | Relationships     | `--cat-relationships-*`|
| `adulting`      | Adulting          | `--cat-adulting-*`    |
| `body_mind`     | Body & Mind       | `--cat-body-mind-*`   |

\* confirm the exact existing enum value for Personal Projects against `src/db/schema/projects.ts`.

The `category-settings` table already stores a per-category `color` override (Phase 1, decision 1.2).
These tokens are the **defaults**; user overrides replace `--cat-*-solid` at runtime, with fill/text
derived from it.

### 2.3 Semantics (DT-3b)

Status communicates by **icon + graphite**, not color — because categories own red/green/orange.
Color appears only for genuinely critical alerts.

```css
:root {
  --status-ink:      var(--ink);        /* default status text */
  --status-icon:     var(--ink-muted);  /* success/info/neutral icons */
  --status-critical: #b3122a;           /* deep crimson — reserved, distinct from --cat-relationships-solid */
}
```

- Success / info / warning: icon + graphite text on `--surface`/`--surface-2`. No fill color.
- Destructive actions: graphite button + trash icon (not red).
- `--status-critical`: only for irreversible-danger confirmation or hard errors. Deep crimson,
  deliberately darker than the Relationships red so the two never read as the same thing.

---

## 3. Theming (DT-4)

Light theme ships in v1. **No dark theme yet**, but every color above is a semantic variable
(`--surface`, `--ink`, `--cat-*`, …), never a raw hex at the use site, so a dark theme = one
additional `:root[data-theme="dark"]` block remapping the same variable names. Adaptive "night"
(warmer/dimmer after dark) is deferred to a later pass; the variable structure already supports it.

Build rule: **no component may reference a raw hex** — only the tokens in this doc.

---

## 4. Typography (DT-5b)

```css
:root {
  --font-sans: "Figtree", system-ui, -apple-system, "Segoe UI", sans-serif;
  /* type scale — compact (DT-5a) */
  --text-caption: 11px;   /* timestamps, micro-labels */
  --text-meta:    12px;   /* due labels, secondary meta */
  --text-body:    13px;   /* task title, row text (base) */
  --text-subtitle:15px;   /* section subtitles */
  --text-title:   17px;   /* surface titles */
  --text-h1:      20px;   /* page headings */
  /* weights — two only */
  --weight-regular: 400;
  --weight-medium:  500;
  /* line-height */
  --leading-tight: 1.25;  /* headings */
  --leading-body:  1.4;   /* body, rows */
}
```

Two weights only (400 / 500). Sentence case everywhere. Replaces Geist.

---

## 5. Spacing, radius, elevation, density

### 5.1 Spacing — 4px grid

```css
:root {
  --space-0:2px; --space-1:4px; --space-2:6px; --space-3:8px;
  --space-4:12px; --space-5:16px; --space-6:20px; --space-7:24px; --space-8:32px;
}
```

### 5.2 Radius (DT-5c — crisp)

```css
:root {
  --radius-card:    8px;
  --radius-row:     5px;
  --radius-control: 5px;
  --radius-chip:    5px;
  --radius-pill:    9999px;
}
```

### 5.3 Elevation (DT-5c — flat)

```css
:root {
  --shadow-none:    none;             /* default for all surfaces */
  --shadow-overlay: 0 8px 24px rgba(20,28,40,0.12);  /* menus, modals, popovers ONLY */
}
```

### 5.4 Density (DT-5a — compact)

```css
:root {
  --row-min-height: 30px;
  --row-py:         3px;
  --density-base:   13px;   /* == --text-body */
}
```

---

## 6. Migration notes (current code → these tokens)

- Replace `src/styles/glass.css` `--kash-glass-*`, `--kash-accent` (#ff2d55), `--kash-radius-*`,
  `--kash-density-*` with the tokens above. Drop `.glass-panel*` classes; `Card`/`Panel` becomes
  flat (`--surface` + `--border` + `--radius-card`, no blur/shadow).
- `--kash-accent` #ff2d55 → `--accent` graphite. Audit every `accent`/`kash-accent` use site;
  most are chrome (correct → graphite), a few may have implied "category-ish" meaning (move to a
  `--cat-*` token).
- Tailwind: remap the `kash.*` color/ radius/ blur extensions; remove `backdropBlur`/`glass-inset`.
- Keep `category-settings.color` as the runtime override source for `--cat-*-solid`.

---

## 7. Component inventory (DT-6)

Canonical token-consuming components. ⬛ = exists in code · 🆕 = net-new.

**Core task surface** — `TaskRow` ⬛ · `Top3Slot` ⬛ · `FocusBlock` ⬛(partial)
**Category system** — `CategoryStripe` ⬛ · `CategoryDot` ⬛ · `CategoryBadge` ⬛ · `BalanceBar` 🆕
**Inputs & controls** — `Composer` ⬛ · `Button` set 🆕 (graphite primary, ghost, icon-led destructive) · `Chip`/filter 🆕 · `LensControlBar` 🆕 (VF-2)
**Containers & nav** — `Card`/`Panel` ⬛ (glass→flat) · `InPageSwitcher` ⬛ · `NavRailItem` ⬛ · `CommandPaletteRow` ⬛
**Overlays & feedback** — `Modal`/`Popover`/`Menu` ⬛(partial; gets `--shadow-overlay`) · `Toast` 🆕 (icon-led) · `InlineValidation` 🆕 · `Tooltip` 🆕
**Data-viz & states** — `HeatmapCell` 🆕 · `ProgressBar` 🆕 · `EmptyState` 🆕 · `LoadingSkeleton` 🆕 · `ErrorState` 🆕

---

## 8. Draftable (derivable, no decision needed)

- Per-category fill/text values above are computed defaults — fine-tune for AA contrast during build.
- Exact spacing applied per component (paddings/gaps) — derive from the 4px grid.
- Hover/active/disabled state values for `Button`/`Chip` — derive from `--accent` / `--ink` with alpha.
- Focus-ring width + offset — 2px ring at `--focus-ring`, 2px offset.

## 9. Acceptance

- No component references a raw hex; all colors come from tokens here.
- Glass material fully removed; surfaces are flat with firm borders.
- Five categories render correct stripe/fill/text from `--cat-*`, honoring `category-settings` overrides.
- Status uses icon + graphite; `--status-critical` appears only on irreversible-danger paths.
- Compact density + Figtree applied app-wide; type uses only the scale + two weights.
- Light theme complete; adding `[data-theme="dark"]` requires no component changes.
