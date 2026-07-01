#!/usr/bin/env node
/**
 * Tauri beforeBuildCommand hook — runs from apps/desktop; resolves repo root via __dirname.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const tauriDir = path.join(root, "apps/desktop/src-tauri");

/** Tauri removes and recreates bundle/dmg; stale mounts or locks cause opaque bundle_dmg.sh failures. */
function cleanStaleDmgWorkdirs() {
  if (process.platform !== "darwin") return;

  try {
    execSync("hdiutil detach /Volumes/Kash -quiet 2>/dev/null || true", { stdio: "ignore" });
  } catch {
    // best-effort
  }

  for (const rel of ["target/release/bundle/dmg", "target/release/bundle/share/create-dmg"]) {
    const dir = path.join(tauriDir, rel);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

function assertMacOSBundleAssets() {
  if (process.platform !== "darwin") return;
  const icon = path.join(tauriDir, "icons/icon.icns");
  if (!fs.existsSync(icon)) {
    throw new Error(
      `Missing ${icon}. DMG packaging needs icons/icon.icns (see apps/desktop/src-tauri/icons/).`
    );
  }
}

cleanStaleDmgWorkdirs();
assertMacOSBundleAssets();

execSync("npm run build:desktop", { cwd: root, stdio: "inherit", env: process.env });
execSync("node apps/desktop/scripts/prepare-sidecar.mjs", {
  cwd: root,
  stdio: "inherit",
});

const sidecarServer = path.join(tauriDir, "sidecar/server.js");
if (!fs.existsSync(sidecarServer)) {
  throw new Error(
    `Sidecar bundle missing at ${sidecarServer}. prepare-sidecar.mjs should run before Tauri bundles resources.`
  );
}
