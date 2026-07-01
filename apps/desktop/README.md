# Kash macOS (Tauri)

Desktop app: Tauri 2 shell + bundled Next.js standalone sidecar + SQLite offline store.

## Development

```sh
# From Flowstate/
npm ci
npm run desktop:dev  # Tauri window + Next dev server (SQLite offline mode)
```

`desktop:dev` automatically sets `DATABASE_MODE=sqlite`, `KASH_DESKTOP=1`, and `KASH_DATA_DIR` (default `~/Library/Application Support/com.frontenac.kash`) so local saves and sync match the release build. Supabase env vars in `.env.local` are still required for auth and sync when online.
**Stale `.next` cache:** If the web or desktop dev server shows odd HMR or build errors after switching branches or config, delete the Next cache and restart: `npm run dev:clean` (from repo root; same as `npm run dev` but removes `.next` first).

If you previously used the old `~/Library/Application Support/Kash` path, move `kash.db` into the new directory once.

To override the data directory:

```
KASH_DATA_DIR=/path/to/data npm run desktop:dev
```

## Supabase auth (hosted project)

Desktop loads on `http://127.0.0.1:3000` in dev and `http://127.0.0.1:4310` in release. Add both origins in the **hosted** Supabase dashboard (Authentication → URL Configuration):

- `http://127.0.0.1:3000/**` (desktop:dev)
- `http://127.0.0.1:4310/**` (release sidecar)

Local Supabase (`supabase/config.toml`) includes these for `supabase start`. Do not run `supabase config push` for auth unless you intend to sync hosted auth policy.

Register `kash://` in redirect URLs when enabling OAuth in the desktop WebView.

## Release build

```sh
npm run desktop:build
```

Output: `apps/desktop/src-tauri/target/release/bundle/dmg/`

### CI release (GitHub Actions)

Tag pushes and manual `workflow_dispatch` on [`.github/workflows/release.yml`](../../.github/workflows/release.yml) require these **repository secrets** (same values as Vercel production / hosted Supabase):

| Secret                          | Source                                        |
| ------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings → API → `anon` key  |

`NEXT_PUBLIC_*` vars are baked into the client bundle at build time. The workflow fails fast if either secret is missing.

## Notarization

Add GitHub secrets documented in `.github/workflows/desktop-macos.yml` (`APPLE_CERTIFICATE`, `APPLE_ID`, etc.).
