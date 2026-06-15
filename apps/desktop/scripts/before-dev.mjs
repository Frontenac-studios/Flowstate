#!/usr/bin/env node
/**
 * Tauri beforeDevCommand hook — runs from apps/desktop; resolves repo root via __dirname.
 * Forces SQLite mode so desktop:dev matches release offline-save behavior.
 */
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

// Must match Tauri identifier in apps/desktop/src-tauri/tauri.conf.json
const KASH_APP_DATA_DIR_NAME = "com.frontenac.kash";

const defaultDataDir = path.join(
  process.env.HOME ?? os.homedir(),
  "Library",
  "Application Support",
  KASH_APP_DATA_DIR_NAME
);

execSync("npm run dev", {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_MODE: "sqlite",
    KASH_DESKTOP: "1",
    KASH_DATA_DIR: process.env.KASH_DATA_DIR ?? defaultDataDir,
  },
});
