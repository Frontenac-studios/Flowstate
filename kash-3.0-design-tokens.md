# Kash 3.0 — Design Tokens Spec

> The implementation spec for §5 (Design System & Visual Language) of `kash-3.0-plan.md`.
> Decisions span the Design Tokens sessions (Jun 22 → Jun 25 → **Jun 30 closure, DT-9…DT-20**). **§5 is now
> direction 100% / spec 100% — build-ready** (see the status note at the foot of the doc). This doc is build-ready:
> hand it to a build session to replace the legacy `kash-*` glass tokens in `src/styles/glass.css`
>
> - `tailwind.config.ts`. Companions: `kash-3.0-plan.md` (§5), `kash-3.0-build-breakdown.md` (§5).
>
> **⚠ REVISED Jun 24 — black-and-white redesign.** The original "flat-calm" palette read **too gray**. This doc now reflects the B&W direction (see `kash-3.0-visual-redesign.md`): **pure white** surfaces, near-black ink `#16181d`, hairline borders, **accent = black** with **outline** primary buttons — no gray backdrop, no graphite. Color stays reserved for categories (the Apple hexes in §2.2), shown as a 3px left stripe. The Abyss (dark) and Care garden (lush) remain deliberate exceptions.

---

## 0. Decision log

| #     | Decision             | Choice                                                                                                                                                                                                                                                                                        |
| ----- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DT-1  | Aesthetic            | **Black-and-white, flat** (revised Jun 24) — pure white surfaces, near-black ink, hairline borders, no glass/gray-backdrop                                                                                                                                                                    |
| DT-2  | Accent               | **Black** `#16181d` (revised Jun 24, was graphite) — **outline** primary buttons; all saturation reserved for category meaning                                                                                                                                                                |
| DT-3  | Category palette     | **Kash category set** (curated hexes — _not_ Apple's iOS system colors, despite "Apple" in older docs): Blue=Professional · Purple=Personal Projects · Red=Relationships · Orange=Adulting · Green=Body & Mind · Yellow reserved                                                              |
| DT-3b | Semantics            | **Icon-led + graphite**; color used only for genuinely critical alerts                                                                                                                                                                                                                        |
| DT-4  | Theming              | **Light only** for v1; tokens structured so a dark theme drops in later without rework                                                                                                                                                                                                        |
| DT-5a | Density              | **Compact** (~30px rows, 13px base text)                                                                                                                                                                                                                                                      |
| DT-5b | Typeface             | **Figtree**                                                                                                                                                                                                                                                                                   |
| DT-5c | Surface finish       | **Crisp + structured** — 8px cards / 5px rows, firm border, no shadow (one shadow token for overlays only)                                                                                                                                                                                    |
| DT-6  | Components           | Canonical inventory locked (24 components, ~13 net-new) — see §7                                                                                                                                                                                                                              |
| DT-7  | Active states        | **Soft unified gray** `--active-surface` #eceef1 (nav pill · segmented track · Week gray); white pill/today-column raised **border-only, no shadow** (Jun 25)                                                                                                                                 |
| DT-8  | Project-mode color   | Multi-project calendar project-mode **cycles the existing 6 category hexes** (no new hues); explicit toggle relabels color "project," legend required (Jun 25)                                                                                                                                |
| DT-9  | ink-faint AA         | **Darken `--ink-faint` → `#767e8e`** (4.08:1, passes AA for text). `--ink-muted` unchanged. Retires the "decorative-only" caveat (Jun 30)                                                                                                                                                     |
| DT-10 | Category color-alone | Keep the **vivid brand solids**; add a **1px ink ring** (`--mark-ring`) on any surface that shows category **by color alone** (Year week-dots, balance-bar segments). No darkened `-solid` variants (Jun 30)                                                                                  |
| DT-11 | Dark theme           | **Deferred — v1 ships light-only** (locks DT-4). Structure confirmed dark-ready via the Abyss `[data-abyss-theme]` remap; `[data-theme="dark"]` drops in later with no component changes. Adaptive "night" also deferred (Jun 30)                                                             |
| DT-12 | Icon library         | **Adopt `lucide-react`** — replaces the hand-rolled Lucide-style inline SVGs; named imports, tree-shaken (Jun 30)                                                                                                                                                                             |
| DT-13 | Icon stroke / size   | **strokeWidth 1.8** system-wide; `--icon-sm 14 · --icon-md 16 · --icon-lg 20 · --icon-xl 24` (inline / default UI / nav rail / hero) (Jun 30)                                                                                                                                                 |
| DT-14 | Focus system         | **Nav fill-inverts** (ink pill / white icon, distinct from gray active pill); **content = 2px ink edge** via inset shadow (no reflow); **ink-edged controls invert** (outline-primary → ink fill / white text); borderless = 2px inset ink ring. `--focus-ring` = solid `var(--ink)` (Jun 30) |
| DT-15 | Toast                | **Light/surface**, icon-led, `--shadow-overlay`, slide-up + fade (AN-X2); error icon = `--crimson` (Jun 30)                                                                                                                                                                                   |
| DT-16 | Tooltip              | **Dark/ink** (`--tooltip-bg` = `var(--ink)`, white text), `--radius-control` (Jun 30)                                                                                                                                                                                                         |
| DT-17 | InlineValidation     | Crimson field edge (border → `var(--crimson)` + inset 1px shadow) + alert icon + crimson message (Jun 30)                                                                                                                                                                                     |
| DT-18 | ReviewNudgeChip      | **Ink left-stripe mini-card** — `--radius-row`, 3px ink stripe (`--stripe-width`), muted icon, ink text, Review action + × dismiss; inherits the task-row vocabulary; never auto-opens (Jun 30)                                                                                               |
| DT-19 | Z-index scale        | **Lean 5-tier:** `--z-base 0 · --z-sticky 100 · --z-overlay 200 · --z-modal 300 · --z-toast 400` (Jun 30)                                                                                                                                                                                     |
| DT-20 | Micro text           | **Refactor 10px → `--text-caption` (11px);** scale floor stays 11px, no `--text-micro` token (Jun 30)                                                                                                                                                                                         |

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
  /* surfaces — pure white, minimal gray (B&W redesign, Jun 24) */
  --bg: #ffffff; /* app backdrop — WHITE, not the old gray #f5f6f8 */
  --surface: #ffffff; /* cards, panels */
  --surface-2: #fafafa; /* subtle inset only */
  /* borders — hairline, not firm */
  --border: #ececec; /* hairline border */
  --border-subtle: #f4f4f4; /* low-emphasis dividers */
  /* ink — crisp near-black */
  --ink: #16181d; /* primary text */
  --ink-muted: #6b7280; /* secondary text, meta */
  --ink-faint: #767e8e; /* hints, disabled — DT-9: darkened from #9aa0ad to 4.08:1 (AA) */
  /* accent = BLACK (DT-2 revised — black, not graphite) */
  --accent: #16181d; /* active nav (black pill), links */
  --accent-hover: #000000;
  --on-accent: #ffffff;
  /* NOTE: primary buttons are OUTLINE — border 1.5px var(--ink), no fill, ink text */
  /* focus (DT-14): solid ink, not alpha. See §2.5 for the full focus system. */
  --focus-ring: var(--ink);
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  /* 1px ink ring for category marks shown by colour ALONE (DT-10) */
  --mark-ring: rgba(22, 24, 29, 0.35);
  /* category left-stripe / nudge-chip stripe width (DT-18) */
  --stripe-width: 3px;

  /* active states (A2, decided Jun 25) — soft unified gray, strictly flat (border only) */
  --active-surface: #eceef1; /* nav active pill · segmented track · Week gray background */
  --active-raised: #ffffff; /* inset white pill · Week "today" column — raised, not filled */
  --active-raised-border: #e2e4e8; /* hairline that sells the raised pill; NO shadow (kept flat) */
}
```

> **`--ink-faint` AA (DT-9, Jun 30):** darkened to `#767e8e` = **4.08:1 on white — passes AA for text.**
> The old `#9aa0ad` (2.62:1) and its "decorative-only" restriction are retired; `--ink-faint` is now safe
> for readable hints/meta as well as disabled text. `--ink-muted` (`#6b7280`, 4.83:1) stays the tier above it.

> **Active states render flat:** the white pill / today-column read as "raised" purely via
> `--active-raised-border` against `--active-surface` — no shadow (DT-5c flat-elevation rule preserved;
> `--shadow-overlay` stays overlay-only).

### 2.2 Category palette (DT-3)

Five life areas mapped to the **Kash category set** (the canonical hexes below — informally "Apple hexes"
in earlier docs, but these are a curated set, not Apple's iOS system palette). Each category exposes three
tokens: a **fill** (light tint for pills / selected backgrounds), a **solid** (the stripe, dot, balance-bar
segment — the category hex), and **text** (a darkened shade for text on the fill, meeting AA on the light
fill). Yellow is reserved (not a category) for status/highlight use.

> **Canonical hexes (do not substitute):** Professional `#009ddc` · Personal Projects `#973d97` ·
> Relationships `#e03a3e` · Adulting `#f6821f` · Body & Mind `#61bb47`. These match the built tokens.
> _(Mockups that used iOS system hexes like `#0A84FF` are off-palette.)_

> **AA notes (verified Jun 25):** All five `-text`/`-fill` pairs pass WCAG AA (5.3–7.9:1). **Caveat:**
> the Adulting (`#f6821f`, 2.58:1) and Body & Mind (`#61bb47`, 2.41:1) **solids** fall below the 3:1
> non-text threshold against white — acceptable only because a category mark is _always_ paired with a
> text label (color is never the sole signal). **DT-10 (Jun 30):** where a surface _does_ show a category
> by colour alone (the Year view's per-week dominant-colour dots, the quarter balance-bar segments), keep the
> vivid brand solid and add a **1px `--mark-ring` ink hairline** around the mark for a legible edge — do **not**
> substitute a darkened solid. This preserves the exact brand hexes everywhere while satisfying the 3:1
> non-text edge requirement.

```css
:root {
  /* Professional — Blue */
  --cat-professional-fill: #e5f5fc;
  --cat-professional-solid: #009ddc;
  --cat-professional-text: #0a6a93;
  /* Personal Projects — Purple */
  --cat-personal-fill: #f4e8f4;
  --cat-personal-solid: #973d97;
  --cat-personal-text: #6e2c6e;
  /* Relationships — Red */
  --cat-relationships-fill: #fce8e9;
  --cat-relationships-solid: #e03a3e;
  --cat-relationships-text: #962427;
  /* Adulting — Orange */
  --cat-adulting-fill: #fdeede;
  --cat-adulting-solid: #f6821f;
  --cat-adulting-text: #9a4e08;
  /* Body & Mind — Green */
  --cat-body-mind-fill: #ecf6e8;
  --cat-body-mind-solid: #61bb47;
  --cat-body-mind-text: #3a7026;
  /* Reserved — Yellow (status/highlight, never a category) */
  --reserved-yellow-fill: #fff4dc;
  --reserved-yellow-solid: #fcb827;
  --reserved-yellow-text: #8a5a14;
}
```

Enum mapping (the DB `project_category` values → tokens):

| Enum value          | Category          | Token prefix            |
| ------------------- | ----------------- | ----------------------- |
| `professional`      | Professional      | `--cat-professional-*`  |
| `personal_projects` | Personal Projects | `--cat-personal-*`      |
| `relationships`     | Relationships     | `--cat-relationships-*` |
| `adulting`          | Adulting          | `--cat-adulting-*`      |
| `body_mind`         | Body & Mind       | `--cat-body-mind-*`     |

_Enum verified Jun 25 against `src/db/schema/projects.ts`: `["professional", "personal_projects", "relationships", "body_mind", "adulting"]`. Note the token prefix is `--cat-personal-*` while the enum value is `personal_projects` — the build must map enum → prefix, not assume they're identical._

The `category-settings` table already stores a per-category `color` override (Phase 1, decision 1.2).
These tokens are the **defaults**; user overrides replace `--cat-*-solid` at runtime, with fill/text
derived from it.

### 2.2b Multi-project calendar — project-mode coloring (A1, decided Jun 25)

The multi-project calendar (§9) has a **category ⇄ project** color toggle, default **category**. In
**project-mode** it does **not** introduce new hues — it **cycles the existing six** `--cat-*-solid` +
`--reserved-yellow-solid` values to distinguish projects. Because the mode is an explicit toggle, color is
**relabeled** "project, not category" while it's active. Requirements:

- The toggle's **active state must be unmistakable** (so a blue bar isn't misread as "Professional"), and
  project-mode shows a **legend**.
- The cycle **repeats after 6 projects** (7th reuses the first hex) — disambiguated by the row label.
- _No new color tokens are added_; project-mode is purely a re-mapping of the existing palette.
- _Rejected:_ tertiary/new hues (the wheel is already claimed), neutral value/pattern ramps, and
  category-hue-plus-tint (the user chose maximal distinctness via the known palette).

### 2.3 Semantics (DT-3b)

Status communicates by **icon + graphite**, not color — because categories own red/green/orange.
Color appears only for genuinely critical alerts.

```css
:root {
  --crimson: #b3122a; /* single source — deep crimson, distinct from --cat-relationships-solid */
  --status-ink: var(--ink); /* default status text */
  --status-icon: var(--ink-muted); /* success/info/neutral icons */
  --status-critical: var(--crimson); /* irreversible-danger / hard errors only */
}
```

> **One crimson, aliased (DRY fix, Jun 25):** `--crimson` is the single literal; `--status-critical`,
> `--priority-high`, and `--due-overdue` (§7.5) all reference `var(--crimson)` — never re-hardcode `#b3122a`.
> This is the VF4-R1 "one crimson" rule made literal.

- Success / info / warning: icon + graphite text on `--surface`/`--surface-2`. No fill color.
- Destructive actions: graphite button + trash icon (not red).
- `--status-critical`: only for irreversible-danger confirmation or hard errors. Deep crimson,
  deliberately darker than the Relationships red so the two never read as the same thing.

### 2.4 Focus system (DT-14)

Focus is **all-ink / monochrome** (decision-wrap). The old soft alpha ring (`rgba(22,24,29,0.35)`, ~2.6:1)
was **too faint to reliably signal focus**, so `--focus-ring` is now **solid `var(--ink)`**. One system, three
surface-aware recipes — all **zero layout-shift** (`:focus-visible` only):

| Surface                                                        | Treatment                                                  | Recipe                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| **Nav-rail items** (and any control that's a filled/pill chip) | **fill-inverts** to an ink pill, icon flips white          | `background: var(--ink); color: var(--on-accent);`                  |
| **Bordered content controls** (inputs, cards, chips, menus)    | border → ink, reads as a crisp **2px ink edge**, no reflow | `border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink);` |
| **Ink-edged controls** (outline-primary `Button`)              | **invert** (a darker edge wouldn't show)                   | `background: var(--ink); color: var(--on-accent);`                  |
| **Borderless interactive** (task rows, ghost buttons)          | 2px inset ink ring                                         | `box-shadow: inset 0 0 0 var(--focus-ring-width) var(--ink);`       |

- **No collision with active state:** the nav **active** pill is `--active-surface` gray; **focus** is ink — the
  two are unambiguous (gray = "you're here", ink = "keyboard is here"). An active-and-focused item shows the
  ink focus fill.
- `--focus-ring-width: 2px`, `--focus-ring-offset: 2px` (offset used where an outer `outline` is preferred over
  the inset technique — e.g. free-standing icon buttons that have room to grow).
- On a **coloured/tint fill** (a category-tint chip) the ink ring gains a 2px white gap
  (`box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--ink)`) so it stays legible.

### 2.5 Overlay & component-surface tokens

Aliases the new feedback components consume (DT-15…DT-18) — all resolve to existing primitives, no new hexes:

```css
:root {
  --tooltip-bg: var(--ink); /* DT-16 — dark tooltip */
  --tooltip-ink: var(--on-accent);
  /* Toast, InlineValidation, ReviewNudgeChip reuse --surface / --border / --shadow-overlay /
     --crimson / --ink-muted / --stripe-width — see §7.6 for anatomy. */

  /* z-index / layering scale (DT-19) — lean 5-tier */
  --z-base: 0;
  --z-sticky: 100; /* app header, nav rail, sticky summary bands */
  --z-overlay: 200; /* menus, popovers, tooltips */
  --z-modal: 300; /* modal backdrop + dialog, command palette (⌘K), ⌘⇧A capture */
  --z-toast: 400; /* toasts — always on top */

  /* iconography (DT-13) */
  --icon-sm: 14px; /* inline / meta */
  --icon-md: 16px; /* default UI */
  --icon-lg: 20px; /* nav rail */
  --icon-xl: 24px; /* empty-state / hero */
}
```

> **Layering caveat (lean scale):** `--z-overlay` (tooltips) sits **below** `--z-modal`. A tooltip that must
> appear _over_ a modal (rare) renders inside the modal's own stacking context or is bumped to `--z-toast`.
> Toasts (`--z-toast`) intentionally clear modals so confirmations are never trapped behind a dialog.

---

## 3. Theming (DT-4 / DT-11 — locked deferred)

**Locked (DT-11, Jun 30): v1 ships light-only.** Dark theme and adaptive "night" (warmer/dimmer after dark)
are **deliberately deferred**, not merely "not done yet" — this is what makes the §5 direction 100%.

The deferral is safe because the structure is **proven**, not assumed: every colour above is a semantic
variable (`--surface`, `--ink`, `--cat-*`, …), never a raw hex at the use site, and **the Abyss already ships
a working dark remap** — `.abyss-root[data-abyss-theme="dark"]` in `tokens.css` remaps surfaces, ink, borders
_and_ luminance-lifts the five `--cat-*-solid`s for near-black, with component code resolving `var(--cat-*)`
unchanged. A global dark theme is therefore the same move at `:root` scope: one `:root[data-theme="dark"]` block
remapping the same names — **no component changes**.

Build rule: **no component may reference a raw hex** — only the tokens in this doc. (Audited Jun 30: the only
raw hexes at use sites are in `care/GardenScene.tsx`, the sanctioned garden-art exception per DT-1.)

---

## 4. Typography (DT-5b)

```css
:root {
  --font-sans: "Figtree", system-ui, -apple-system, "Segoe UI", sans-serif;
  /* type scale — compact (DT-5a) */
  --text-caption: 11px; /* timestamps, micro-labels */
  --text-meta: 12px; /* due labels, secondary meta */
  --text-body: 13px; /* task title, row text (base) */
  --text-subtitle: 15px; /* section subtitles */
  --text-title: 17px; /* surface titles */
  --text-h1: 20px; /* page headings */
  /* weights — two only */
  --weight-regular: 400;
  --weight-medium: 500;
  /* line-height */
  --leading-tight: 1.25; /* headings */
  --leading-body: 1.4; /* body, rows */
}
```

Two weights only (400 / 500). Sentence case everywhere. Replaces Geist.

> **Scale floor (DT-20, Jun 30):** `--text-caption` (11px) is the **minimum**. The 17 in-code `text-[10px]`
> micro-labels (nav-rail labels, month-calendar cell numbers, badges, drag handles) are **refactored up to
> `--text-caption`**; no `--text-micro` token is added. The 3 `text-[11px]` sites fold into `--text-caption`.
> Net: nothing renders below 11px, and every type size comes from the scale.

---

## 5. Spacing, radius, elevation, density

### 5.1 Spacing — 2px-base grid

```css
:root {
  --space-0: 2px;
  --space-1: 4px;
  --space-2: 6px;
  --space-3: 8px;
  --space-4: 12px;
  --space-5: 16px;
  --space-6: 20px;
  --space-7: 24px;
  --space-8: 32px;
}
```

### 5.2 Radius (DT-5c — crisp)

```css
:root {
  --radius-card: 8px;
  --radius-row: 5px;
  --radius-control: 5px;
  --radius-chip: 5px;
  --radius-pill: 9999px;
}
```

### 5.3 Elevation (DT-5c — flat)

```css
:root {
  --shadow-none: none; /* default for all surfaces */
  --shadow-overlay: 0 8px 24px rgba(20, 28, 40, 0.12); /* menus, modals, popovers ONLY */
}
```

### 5.4 Density (DT-5a — compact)

```css
:root {
  --row-min-height: 30px;
  --row-py: 3px;
  --density-base: 13px; /* == --text-body */
}
```

### 5.5 Motion (AN-0b + animation handoff)

Formalizes the motion language as build tokens. Durations + easings are the AN-0b set from
`kash-3.0-animation-sweep.md`; the four marked **NEW** are added for the bespoke moments specced in
`kash-3.0-animation-handoff.md` (overshoot settles, looping breaths, the rare celebration beat). Motion
tokens only — no color impact. Build rule (as for color): **no component inlines a raw ms/easing value;
reference these tokens.** Reduced motion is a global override (AN-0c), not a per-component concern.

```css
:root {
  /* durations (AN-0b) */
  --motion-micro: 90ms; /* hovers, taps, pip toggles */
  --motion-short: 160ms; /* toggles, chips, cross-fades, micro-pops */
  --motion-medium: 240ms; /* rows/cards enter, panels, zoom level, fly-to-slot */
  --motion-long: 420ms; /* page/zoom celebrations, focus entrance, garden growth */

  /* easings (AN-0b) */
  --ease-enter: ease-out; /* elements appearing */
  --ease-move: cubic-bezier(0.22, 0.61, 0.36, 1); /* elements repositioning */
  --ease-exit: ease-in; /* elements leaving */

  /* NEW — gentle "settle past then back": star pop (AN-B3), garden overshoot (AN-C3),
     line-bingo pop (AN-P2), bingo-lock cell settle (AN-B8). Soft, not springy. */
  --ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* NEW — sinusoidal in-out for looping breath: Care orb (AN-C1), focus breath (AN-B1),
     sync/pending dots (AN-B7). Symmetric, no harsh ends. */
  --ease-breath: cubic-bezier(0.37, 0, 0.63, 1);

  /* NEW — the rare, once-in-a-while celebration beat, bigger than --motion-long:
     project complete (AN-B6), blackout finale (AN-P2b), bingo lock (AN-B8). */
  --motion-celebrate: 540ms;

  /* NEW — ambient breath-loop period (one full inhale+exhale) for chrome breaths
     (sync dot, focus ring pulse). NOT Care's technique pace (data-driven, AN-C2). */
  --breath-pulse: 2400ms;
}
```

> **Reduced motion (AN-0c):** ship one global `@media (prefers-reduced-motion: reduce)` block that swaps
> transform-based keyframes for an opacity fade at `--motion-short` and `animation: none`s every loop
> (breaths, dots, depleting-ring pulse) to its resting state. No in-app toggle.

> **Canonical home (reconciled Jun 30):** `tokens.css` is the **single source of truth** for `--motion-*`,
> `--ease-*`, `--motion-celebrate`, and `--breath-pulse`; `kash-3.0-animation-sweep.md` (§0/§7) is the
> _behavioural_ spec and references these tokens rather than redefining values. **Verified:** every AN-0b/§7
> moment maps to an existing token (overshoot → `--ease-overshoot`, breath loops → `--breath-pulse`,
> celebrations → `--motion-celebrate`); the three still-open bespoke animations (project-complete redo,
> create-shimmer + sync pulse, bingo-lock) **compose from these tokens and add none** — they are choreography
> decisions for the animation pass, not §5 token gaps. _Build note:_ the current `tokens.css`
> `prefers-reduced-motion` block only remaps durations; the animation build must extend it to `animation: none`
> the loops and swap transform keyframes for opacity fades (per AN-0c above).

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
- **DT-9:** `--ink-faint` value changes `#9aa0ad → #767e8e`; no use-site changes needed (semantic var).
- **DT-12/13 (icons):** `npm install lucide-react`; replace hand-rolled inline SVGs (nav rail, `abyss/icons.tsx`,
  the ad-hoc `size={9..17}` icons) with named `lucide-react` imports at the `--icon-*` sizes and a global
  `strokeWidth={1.8}` default. Promote any bespoke glyph into one shared icon module.
- **DT-14 (focus):** replace the `.glass-input:focus` soft-alpha ring and add `:focus-visible` recipes per §2.4
  across `Button`/`Chip`/nav/rows. Old `--focus-ring` alpha → solid `var(--ink)`.
- **DT-20 (micro text):** refactor the 17 `text-[10px]` + 3 `text-[11px]` sites to `--text-caption`.
- **DT-19 (z-index):** replace ad-hoc `z-10/20/30/40/50/[1]` with the `--z-*` scale.
- **DT-10 (mark ring):** add the `--mark-ring` hairline to Year week-dots + balance-bar segments (colour-alone).

---

## 7. Component inventory (DT-6)

Canonical token-consuming components. ⬛ = exists in code · 🆕 = net-new.

**Core task surface** — `TaskRow` ⬛ · `Top3Slot` ⬛ · `FocusBlock` ⬛(partial)
**Category system** — `CategoryStripe` ⬛ · `CategoryDot` ⬛ · `CategoryBadge` ⬛ · `BalanceBar` 🆕 (Today; planned-population, Top-3-weighted, lopsided-warning state, empty-category hatch; built to swap to time-based later)
**Inputs & controls** — `Composer` ⬛ · `Button` set 🆕 (graphite primary, ghost, icon-led destructive) · `Chip`/filter 🆕 · `LensControlBar` 🆕 (VF-2)
**Containers & nav** — `Card`/`Panel` ⬛ (glass→flat) · `InPageSwitcher` ⬛ (uses `--active-surface` track + `--active-raised` pill) · `NavRailItem` ⬛ (active = `--active-surface` pill) · `CommandPaletteRow` ⬛
**Overlays & feedback** — `Modal`/`Popover`/`Menu` ⬛(partial; gets `--shadow-overlay`) · `Toast` 🆕 · `InlineValidation` 🆕 · `Tooltip` 🆕 · `ReviewNudgeChip` 🆕 — **all four now spec'd, see §7.6** (anatomy/states/tokens)
**Data-viz & states** — `HeatmapCell` 🆕 · `ProgressBar` 🆕 (project/phase % progress = weighted task-weight ratio) · `EmptyState` 🆕 · `LoadingSkeleton` 🆕 · `ErrorState` 🆕
**Today/Week additions (Jun 25)** — `CompletionMarker` 🆕 (untimed-task tick on the Calendar) · `AllDayProtectedChip` ⬛ (timeless protected block pinned above the timeline; built) · `ProtectedBlockChip` ⬛ (Week column placeholder; built) · `ColumnTallyPopover` 🆕 (Week per-day category tally on hover/tap) · `OverCommitFlag` 🆕 (gentle non-blocking day-overload warning) · `EstimateConfidence` 🆕 ("learning…" state until n≈3 samples) · `WindDownSetting` 🆕 (single wind-down time → EoD nudge + Top-3 deadline)

---

## 7.5 Priority & due urgency (VF-4)

Reconciles the VF-1 priority dots + due labels with the flat-calm palette so urgency never
collides with category color (which owns saturation for _meaning_). Principle: lean on
**graphite intensity + count + weight**; spend a hue (crimson) only on genuine "act now."

**Decision log**

| #      | Decision            | Choice                                                                          |
| ------ | ------------------- | ------------------------------------------------------------------------------- |
| VF4-P1 | Priority encoding   | Graphite ramp, crimson only at High                                             |
| VF4-P2 | Priority redundancy | Always count-coded (1/2/3 dots) — legible without color                         |
| VF4-P3 | None level          | Empty + reserved width (no reflow)                                              |
| VF4-D1 | Due encoding        | Crimson overdue only; today/tomorrow graphite bold; rest muted                  |
| VF4-D2 | Soon window         | Today + tomorrow (bold)                                                         |
| VF4-D3 | Overdue weight      | Crimson label + bold task title                                                 |
| VF4-R1 | Crimson reuse       | One crimson for urgent (inline) and destructive (controls) — context separates  |
| VF4-R2 | Red vs red          | Priority dots distinct from Relationships stripe by shape + darker shade + zone |
| VF4-R3 | Double alarm        | High + overdue may show crimson 2–3× — intentional reinforcement                |

**Priority pips** (always 1/2/3 dots; `--priority-*`):

| Level | Dots | Token             | Value            |
| ----- | ---- | ----------------- | ---------------- |
| None  | —    | (reserved width)  | —                |
| Low   | 1    | `--priority-low`  | `#c2c6cd`        |
| Med   | 2    | `--priority-med`  | `#8a909b`        |
| High  | 3    | `--priority-high` | `var(--crimson)` |

**Due label** (trailing; suppressed on day-grouped surfaces; `--due-*`):

| State            | Token                                | Treatment                      |
| ---------------- | ------------------------------------ | ------------------------------ |
| Overdue          | `--due-overdue` (`= var(--crimson)`) | crimson label **+ bold title** |
| Today / tomorrow | `--due-soon`                         | graphite **bold** label        |
| Beyond tomorrow  | `--due-future`                       | muted (`--ink-faint`)          |

**Implementation (built on `feat/design-tokens`):**
`src/lib/tasks/priority.ts` dot ramp → `bg-[var(--priority-*)]`; `src/lib/dates/format-relative-due.ts`
emphasis = `danger` (overdue) / `soon` (today+tomorrow) / `muted`, adds `"tomorrow"`;
`src/components/kash/plan/TaskRow.tsx` due classes → `--due-*` tokens + bold title when overdue.

---

## 7.6 New feedback components (DT-15…DT-18)

Anatomy + states for the four 🆕 overlay/feedback components. All consume existing tokens — no new hexes.

### Toast (DT-15) — light/surface, icon-led

- **Surface:** `--surface` bg · `1px --border` · `--radius-card` · **`--shadow-overlay`** (the sanctioned
  overlay shadow). Ink text (`--ink`).
- **Anatomy:** leading status icon (16px / `--icon-md`) · message (`--text-body`) · optional trailing action
  (ink, underlined) · optional × dismiss (`--ink-faint`).
- **Icon semantics (DT-3b):** success/neutral/info = `--status-icon` graphite check/info; **error/critical =
  `--crimson`** alert icon. No coloured fills — icon carries the state.
- **Motion:** slide-up + fade from the bottom, hold, fade out (**AN-X2**). **Layer:** `--z-toast` (clears modals).

### Tooltip (DT-16) — dark/ink

- **Surface:** `--tooltip-bg` (= `var(--ink)`) · `--tooltip-ink` (white) text · `--radius-control` · small
  caret. `--text-meta` (12px). Deliberately dark so it never reads as a light popover/menu.
- **Behaviour:** hover/focus delay; single-line or short; **never** holds interactive content (that's a Popover).
- **Layer:** `--z-overlay`. **Motion:** `--motion-micro` fade. (See the §2.4 caveat for tooltip-over-modal.)

### InlineValidation (DT-17) — field error

- **Field (error state):** `border-color: var(--crimson)` + `box-shadow: inset 0 0 0 1px var(--crimson)`
  (2px crimson edge, no reflow — mirrors the focus technique).
- **Message:** below the field — `--crimson` alert icon (13px) + `--crimson` text at `--text-meta`.
- **Copy:** say what's wrong + what to do, no "Error:" prefix (e.g. "That date doesn't exist. Try another.").
- Crimson here is the VF4-R1 "one crimson" reused in the _control_ context; never a category red.

### ReviewNudgeChip (DT-18) — soft EoD/EoW nudge

- **Form:** an **ink left-stripe mini-card** — `--surface` · `1px --border` · `--stripe-width` (3px) `--ink`
  left stripe · `--radius-row` (right corners; the stripe side stays square). Inherits the `TaskRow`
  vocabulary so it belongs to the list rather than floating on top.
- **Anatomy:** leading `--status-icon` (moon = EoD / calendar = EoW, 15px) · prompt text (`--ink`,
  `--text-body`) · **Review** action (ink, medium) · × dismiss (`--ink-faint`).
- **Behaviour:** appears at the **end of the day's list** (Today) / above the Week review entry (Week);
  **never auto-opens** the review, always dismissible. **Motion:** `--motion-short` fade-in; dismiss = fade-out.

## 7.7 Iconography system (DT-12, DT-13)

- **Library:** **`lucide-react`** (DT-12) — the app's hand-rolled Lucide-style SVGs are replaced by named
  imports (tree-shaken). Lucide's 24×24 grid, round caps/joins match the existing look; nothing visual changes,
  the source consolidates. Garden art is a **separate illustrative spike**, out of this system's scope.
- **Stroke:** **1.8** everywhere (DT-13) — set once as a global default (`strokeWidth={1.8}`), overriding
  Lucide's native 2.0. Calmer at compact density; matches what the nav already ships.
- **Size scale (DT-13):** `--icon-sm 14` (inline/meta) · `--icon-md 16` (default UI) · `--icon-lg 20`
  (nav rail) · `--icon-xl 24` (empty-state/hero). No ad-hoc `size={9..17}`.
- **Colour:** icons inherit `currentColor` — `--ink` / `--ink-muted` / `--status-icon` per context;
  **`--crimson` only** for genuine error/critical (DT-3b). Category colour is carried by stripes/dots, not icons.
- **A11y:** decorative icons `aria-hidden`; icon-only controls get an `aria-label`.

---

## 8. Draftable (derivable, no decision needed)

- Per-category fill/text values above are computed defaults — fine-tune for AA contrast during build.
- Exact spacing applied per component (paddings/gaps) — derive from the 2px-base grid.
- Hover/active/disabled state values for `Button`/`Chip` — derive from `--accent` / `--ink` with alpha.
- ~~Focus-ring width + offset~~ — **now locked** (DT-14); see the §2.4 focus system.

## 9. Acceptance

- No component references a raw hex; all colors come from tokens here.
- Glass material fully removed; surfaces are flat with firm borders.
- Five categories render correct stripe/fill/text from `--cat-*`, honoring `category-settings` overrides.
- Status uses icon + graphite; `--status-critical` appears only on irreversible-danger paths.
- Compact density + Figtree applied app-wide; type uses only the scale + two weights.
- Light theme complete; adding `[data-theme="dark"]` requires no component changes.
- No component inlines a raw ms/easing; motion uses the §5.5 tokens; `prefers-reduced-motion` is honored
  globally (AN-0c). See `kash-3.0-animation-handoff.md` for per-animation specs.
- **AA:** no readable text below 4.5:1; `--ink-faint` = `#767e8e` (4.08:1) is reserved for hints/disabled
  (large/incidental); nothing renders below `--text-caption` (11px); category colour-alone marks carry a
  `--mark-ring` edge.
- **Focus:** every interactive control has a visible `:focus-visible` state per the §2.4 recipes; nav focus
  (ink) is distinct from nav active (gray); no layout shift on focus.
- **Icons:** all icons come from `lucide-react` at `--icon-*` sizes / strokeWidth 1.8; no ad-hoc SVGs or
  `size={n}` (garden art excepted); `--crimson` icons only on genuine error/critical.
- **Layering:** all stacking uses the `--z-*` scale; no ad-hoc `z-[n]`. Toasts clear modals.
- **Feedback components:** `Toast`, `Tooltip`, `InlineValidation`, `ReviewNudgeChip` built per §7.6.

---

**§5 status (Jun 30): direction 100% · spec 100%.** All open items (AA remediation · dark-theme scope ·
Toast/Tooltip/InlineValidation/ReviewNudgeChip · z-index · focus/accent tokens · iconography · motion
fold-in · component-token coverage) are decided (DT-9…DT-20) and specced above. Build-ready.
