#!/usr/bin/env node
/**
 * Copies Next.js standalone output into Tauri resources for the Node sidecar.
 * Run from repo root: node apps/desktop/scripts/prepare-sidecar.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const standaloneSrc = path.join(root, ".next/standalone");
const staticSrc = path.join(root, ".next/static");
const publicSrc = path.join(root, "public");
const dest = path.join(root, "apps/desktop/src-tauri/sidecar");

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyRecursive(src, destDir) {
  if (!fs.existsSync(src)) {
    console.error(`Missing path: ${src}`);
    process.exit(1);
  }
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(destDir, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(destDir, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(destDir), { recursive: true });
    fs.copyFileSync(src, destDir);
  }
}

if (!fs.existsSync(standaloneSrc)) {
  console.error("Run `npm run build:desktop` first to produce .next/standalone");
  process.exit(1);
}

rmrf(dest);
copyRecursive(standaloneSrc, dest);

const staticDest = path.join(dest, ".next/static");
const publicDest = path.join(dest, "public");
copyRecursive(staticSrc, staticDest);
if (fs.existsSync(publicSrc)) {
  copyRecursive(publicSrc, publicDest);
}

const launcher = `#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
export PORT="\${KASH_SIDECAR_PORT:-4310}"
export HOSTNAME="127.0.0.1"
export DATABASE_MODE="sqlite"
export KASH_DESKTOP="1"
cd "$DIR"
exec node server.js
`;

fs.writeFileSync(path.join(dest, "run-sidecar.sh"), launcher, { mode: 0o755 });
console.log(`Sidecar prepared at ${dest}`);
