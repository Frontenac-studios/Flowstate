# Kash macOS desktop — manual QA checklist

Run after building the desktop app (`npm run desktop:build` from `Flowstate/`).

## Prerequisites

- macOS 12+
- Signed-in Kash account (same Supabase project as web)
- Network available for initial sync

## Offline → online sync

1. Launch Kash.app and sign in.
2. Create a task titled `Offline QA {timestamp}` on Today.
3. Enable airplane mode (or disconnect network).
4. Create a second task `Offline only {timestamp}`.
5. Re-enable network; wait for “Synced at …” banner.
6. Open the web app on Vercel; confirm both tasks appear (order may vary).

## Menu bar

1. Click tray icon → **Quick capture…** — main window focuses; composer is focused (`?focus=composer`).
2. **Open Kash** — window comes to front.
3. **Quit Kash** — app exits; sidecar stops.

## Health / sidecar

1. `curl http://127.0.0.1:4310/api/health` while app runs (release build) → `{ "ok": true, "mode": "sqlite" }`.

## Regression

1. ⌘D focus, timer, complete still work in desktop WebView.
2. Claude chat requires network; offline shows template fallbacks for EoD/nudges where applicable.
