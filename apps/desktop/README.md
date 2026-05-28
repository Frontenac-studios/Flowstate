# Kash macOS (Tauri)

Desktop app: Tauri 2 shell + bundled Next.js standalone sidecar + SQLite offline store.

## Development

```sh
# From Flowstate/
npm ci
npm run dev          # terminal 1 — Next on :3000
npm run desktop:dev  # terminal 2 — Tauri window (requires Rust)
```

Set in `.env.local` for desktop sidecar testing:

```
DATABASE_MODE=sqlite
KASH_DESKTOP=1
```

## Release build

```sh
npm run desktop:build
```

Output: `apps/desktop/src-tauri/target/release/bundle/dmg/`

## Notarization

Add GitHub secrets documented in `.github/workflows/desktop-macos.yml` (`APPLE_CERTIFICATE`, `APPLE_ID`, etc.).

## Deep links

Register `kash://` in Supabase Auth redirect URLs when enabling OAuth in the desktop WebView.
