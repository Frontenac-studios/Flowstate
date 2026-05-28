#!/usr/bin/env node
/**
 * Tauri beforeDevCommand hook — runs from apps/desktop; resolves repo root via __dirname.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

execSync("npm run dev", { cwd: root, stdio: "inherit", env: process.env });
