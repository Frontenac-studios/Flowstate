# design-sync notes — Flowstate

Repo-specific gotchas for syncing this design system to claude.ai/design.
Read this before re-running the sync.

## What this repo is, from design-sync's point of view

Flowstate is a **Next.js app, not a component package** — no `dist/`, no published
entry, no Storybook. The package shape is faked by two committed files:

- `.design-sync/package.json` — a shim whose only jobs are (a) to make `PKG_DIR`
  resolve to `.design-sync/` instead of the repo root, and (b) to point `types` at the
  emitted `.d.ts` tree. **Do not delete it.** Without it `findTypesRoot()` falls back to
  the repo root and ts-morph globs `**/*.d.ts` across `.next/`, `apps/desktop/src-tauri/
target/` and `.claude/worktrees/` — which OOMs node at 8 GB in about two minutes.
- `.design-sync/entry.tsx` — the barrel that _is_ the design system's public surface.
  It re-exports the real shipped components from `src/components/kash/`. **Adding a
  component to the design system means adding it here and to
  `cfg.componentSrcMap`** (the converter has no `.d.ts` tree to discover from, so
  `componentSrcMap` is the authoritative component list).
  It deliberately does not re-export `ui/icon.tsx`'s `export * from "lucide-react"` —
  that would pull ~1500 icon components into the component list.

Config paths are relative to `.design-sync/`, hence the `../src/...` prefixes.

## Re-sync procedure

```sh
nvm use                       # Node 24 — the repo's .nvmrc
npm ci                        # if node_modules is stale

# 1. regenerate the .d.ts tree (cfg.componentSrcMap changed? entry.tsx changed?)
node_modules/.bin/tsc -p .design-sync/tsconfig.dts.json

# 2. regenerate the stylesheet (cfg.buildCmd)
node_modules/.bin/tailwindcss -c .design-sync/tailwind.ds.config.ts \
  -i src/app/globals.css -o .design-sync/.cache/flowstate.css

# 3. restage the converter and run the driver
mkdir -p .ds-sync && cp -r "<skill-base-dir>"/{package-build,package-validate,package-capture,resync}.mjs "<skill-base-dir>"/lib "<skill-base-dir>"/storybook .ds-sync/
(cd .ds-sync && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i esbuild ts-morph @types/react playwright@1.60.0)
node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules \
  --entry ./.design-sync/entry.tsx --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json
```

Steps 1 and 2 are **not** run by the converter — do them yourself, in that order, before
every build. `cfg.buildCmd` only records step 2.

## Toolchain facts

- **Node 24** (`.nvmrc`). Node 20 is what a bare shell gets on this machine — always
  `nvm use` first, or `better-sqlite3` and friends fail on the ABI.
- **Playwright**: the repo pins `@playwright/test@1.60.0`, which wants chromium build
  1223, and that build is already in `~/Library/Caches/ms-playwright/`. Install
  `playwright@1.60.0` into `.ds-sync/` with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` — it
  finds the existing cache. Do **not** let it download another ~200 MB.
- The converter's `package-build.mjs` resets `--out`, which **wipes
  `ds-bundle/_screenshots/`**. Re-run `package-capture.mjs` after any full build or
  there will be no review sheets to grade from.

## The Tailwind safelist is load-bearing

`.design-sync/tailwind.ds.config.ts` safelists every token-mapped utility family.
This is not belt-and-braces: the app's own build is JIT, so a plain compile only emits
the utilities the app uses **today**, while the design system's stylesheet is frozen at
sync time and then used to render **new** markup. Without the safelist, half the
vocabulary named in `conventions.md` would silently resolve to nothing in every design
the agent builds. If you add a token-mapped family to `tailwind.config.ts`, add it to
the safelist and to the table in `conventions.md`.

Known safelist miss: `top-shell` isn't emitted bare (the app only ever uses
`lg:top-shell`), so it is deliberately absent from both the safelist and the
conventions table.

## Fonts

Figtree is loaded by `next/font/google` under a hashed family (`__Figtree_*`), so there
is no shippable `@font-face` in the repo. `.design-sync/fonts/` holds the two woff2 files
copied out of `.next/static/media/` plus a hand-written `figtree.css` re-declaring them
under the real family name at weights 400 and 500 — the only two the app loads. Figtree
is SIL OFL 1.1.

If `.next/` is ever cleaned and the fonts need re-harvesting: run a build, then
`grep -rl Figtree .next/static/css/` to find the hashed filenames.

Geist Sans/Mono (`src/app/fonts/*.woff`) are **not** shipped — no component in the synced
set references `--font-geist-*`.

## Known render warns (expected; a warn NOT on this list is new)

- `[RENDER_THIN] IconButton: mounts have no text and paint nothing` — IconButton is
  icon-only by design. The screenshot shows all four glyphs, three sizes and the
  disabled state rendering correctly. Benign.

## Preview-authoring findings

- **Imports in `previews/*.tsx` are relative** (`../../src/components/kash/ui/Button`),
  not `"Flowstate"`. Both work — the converter's rule 2 redirects any import resolving
  to an exported component's module to `window.Flowstate` — but the repo's `tsconfig.json`
  includes `**/*.tsx` and excludes only `node_modules`, so a bare `"Flowstate"` specifier
  would fail `npm run typecheck`. Relative imports keep the previews inside the repo's
  own type gate, which also keeps them honest against the real props.
- **`Tooltip` is hover-driven** (400ms delay, portals to `document.body`). Its preview
  dispatches a real `mouseover` at the real trigger on mount and pads the cell so the
  centred bubble is not cropped — the component opens itself; nothing draws a stand-in.
  This works because capture waits for `networkidle` (≥500 ms), comfortably past the
  400 ms delay. If that wait ever tightens, these cells go back to trigger-only.
- **`ToastProvider`** raises real toasts through `useToast()` in a mount effect, with
  `duration` held open for 10 minutes so the auto-dismiss can't fire before the
  screenshot.
- **Overlay/portal components need `cardMode: "single"`** (`RitualSheet`, `ToastProvider`,
  `Tooltip`) — in grid mode all three stories portal to the same body and stack on top of
  each other. Wide compositions (task rows, toasts, empty states) need
  `cardMode: "column"`.

## Design-system observations worth acting on in the app (not sync problems)

- `Input`, `Textarea` and `Select` ship **no `disabled` or `readOnly` styling** — those
  states render at browser defaults and are visually identical to the normal state.
  `Button`, `IconButton` and `Checkbox` all handle `disabled:` properly. Worth
  reconciling.

## Re-sync risks — what can silently go stale

- **The `.d.ts` tree is generated, gitignored, and NOT rebuilt by the converter.** A
  fresh clone has no `.design-sync/types/`; a build without step 1 above emits stub prop
  contracts. Always run `tsc -p .design-sync/tsconfig.dts.json` first.
- **The stylesheet is likewise generated and gitignored** (`.design-sync/.cache/`), and
  `cssEntry` points into it. Same rule: regenerate before every build.
- **`entry.tsx` and `componentSrcMap` are hand-maintained and will drift.** A component
  renamed or moved in `src/components/kash/` breaks the build loudly (good); a _new_
  primitive is simply never synced (silent). Re-check the `ui/` folder against the
  barrel on each sync.
- **`conventions.md` names concrete utilities and tokens.** If `tailwind.config.ts` or
  `tokens.css` change, re-validate every name in its table against the fresh build
  before uploading — a class that no longer resolves makes the design agent emit
  silently unstyled output.
- **The preview font check is visual only.** Nothing machine-verifies that Figtree
  actually applied; confirm it on the contact sheets each sync (the giveaway is the
  single-storey `g` and circular `o`).
- **First upload landed 2026-09-22** into `Flowstate Design System`
  (`add0a7de-a735-45eb-8fda-0624c5d0b098`, pinned in `config.json`). 113 files + the
  anchor; the project was created empty by this run, so there were no deletes. From here
  on a re-sync fetches that project's `_ds_sync.json` into
  `.design-sync/.cache/remote-sync.json` and only re-verifies what changed.
- **Do not sync into `Frontenac Advisory Design System`** — that project is the brand-site
  system (Archivo / Cormorant Garamond, hero, case-study-row, stat-chip) and shares
  nothing with Flowstate. Syncing this repo into it would delete all of it.

## `tokens/` and `guidelines/` ship empty — expected

`cfg.tokensGlob` is a no-op without `cfg.tokensPkg`: `copyTokens()` returns early unless
a token **package** exists under `node_modules`, and the glob only narrows _within_ it.
Flowstate keeps its tokens in `src/styles/`, not a package, so nothing lands in
`tokens/`.

This is cosmetic, not functional. The Tailwind compile inlines `tokens.css` and
`glass.css` (via `glass.css`'s `@import`) into `cfg.cssEntry`, which becomes
`_ds_bundle.css`, which `styles.css` imports — so all 235 custom properties, with their
comments, do reach every rendered design. `conventions.md` §5 points the design agent at
the `:root` block in `_ds_bundle.css` for exactly this reason. Don't "fix" it by copying
files into `ds-bundle/tokens/` after a build: the next `package-build.mjs` resets the out
dir and the reconciliation pass would then delete them from the project.

`guidelines/` is empty because `cfg.guidelinesGlob` is set to `[]` — the default
(`docs/*.md`) would otherwise sweep all 21 per-component docs in `.design-sync/docs/`
into `guidelines/` as duplicates.
