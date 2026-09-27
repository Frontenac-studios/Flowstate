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

// better-sqlite3's .node binary was installed for the Node running this build,
// so it only loads under the same native-module ABI (137 = Node 24). A Finder
// launch inherits the login PATH — whatever the nvm default is — and a mismatch
// doesn't fail at boot: better-sqlite3 loads lazily, so /api/health passes and
// the app dies on its first query. The launcher therefore picks a Node by ABI,
// not by PATH, and refuses to start when none matches.
const nodeAbi = process.versions.modules;
const nodeMajor = process.versions.node.split(".")[0];

const launcher = `#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob
DIR="$(cd "$(dirname "$0")" && pwd)"
export PORT="\${KASH_SIDECAR_PORT:-4310}"
export HOSTNAME="127.0.0.1"
export DATABASE_MODE="sqlite"
export KASH_DESKTOP="1"
cd "$DIR"

WANT_ABI="${nodeAbi}"
for candidate in \\
  "\${KASH_NODE:-}" \\
  "$(command -v node || true)" \\
  "$HOME"/.nvm/versions/node/v${nodeMajor}.*/bin/node \\
  /opt/homebrew/opt/node@${nodeMajor}/bin/node \\
  /usr/local/opt/node@${nodeMajor}/bin/node \\
  /opt/homebrew/bin/node \\
  /usr/local/bin/node; do
  [ -x "$candidate" ] || continue
  if [ "$("$candidate" -p process.versions.modules 2>/dev/null)" = "$WANT_ABI" ]; then
    exec "$candidate" server.js
  fi
done

echo "Kash sidecar: no Node ${nodeMajor} found (need native-module ABI $WANT_ABI for better-sqlite3)." >&2
echo "Install it (nvm install ${nodeMajor}) or point KASH_NODE at a Node ${nodeMajor} binary." >&2
exit 1
`;

fs.writeFileSync(path.join(dest, "run-sidecar.sh"), launcher, { mode: 0o755 });
console.log(`Sidecar prepared at ${dest}`);
