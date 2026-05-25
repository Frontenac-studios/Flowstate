#!/usr/bin/env bash
# Bootstrap a fresh clone of the Frontenac Studios template.
# Idempotent: re-run safely. Each integration is a separate function — skip the ones you don't need.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ask() { read -r -p "$1 [y/N] " r; [[ "$r" =~ ^[Yy]$ ]]; }

rename_package() {
  say "Project name"
  local current default
  current="$(node -p "require('./package.json').name")"
  default="$(basename "$ROOT")"
  read -r -p "Package name [$default]: " name
  name="${name:-$default}"
  if [[ "$name" != "$current" ]]; then
    node -e "const f='./package.json';const p=require(f);p.name='$name';require('fs').writeFileSync(f,JSON.stringify(p,null,2)+'\n')"
    echo "  package.json name → $name"
  fi
}

install_deps() {
  say "Installing dependencies"
  if command -v nvm >/dev/null 2>&1; then nvm use || true; fi
  npm install
  npx husky install >/dev/null 2>&1 || true
}

seed_env() {
  say "Environment file"
  if [[ -f .env.local ]]; then
    echo "  .env.local already exists — skipping."
    return
  fi
  cp .env.example .env.local
  echo "  .env.local created from .env.example. Fill in values after Supabase/Sentry setup."
}

setup_supabase() {
  ask "Initialize local Supabase (requires Docker)?" || return 0
  say "Supabase"
  if [[ ! -d supabase ]] || [[ ! -f supabase/config.toml ]]; then
    npx supabase init
  fi
  npx supabase start
  echo "  Writing local Supabase values into .env.local…"
  npx supabase status -o env >> .env.local.supabase.tmp
  # Merge by overwriting matching keys
  python3 - <<'PY'
import re, pathlib

# supabase status -o env uses different names than this template's .env.local keys
ALIASES = {
    "DB_URL": "DATABASE_URL",
    "API_URL": "NEXT_PUBLIC_SUPABASE_URL",
    "ANON_KEY": "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SERVICE_ROLE_KEY": "SUPABASE_SERVICE_ROLE_KEY",
}

env = pathlib.Path('.env.local')
patch = pathlib.Path('.env.local.supabase.tmp').read_text().splitlines()
vals = dict(line.split('=', 1) for line in patch if '=' in line and not line.startswith('#'))
text = env.read_text()
for k, v in vals.items():
    targets = {k, ALIASES.get(k, "")} - {""}
    for key in targets:
        pat = re.compile(rf'^{re.escape(key)}=.*$', re.M)
        if pat.search(text):
            text = pat.sub(f'{key}={v}', text)
        else:
            text += f'\n{key}={v}\n'
env.write_text(text)
PY
  rm -f .env.local.supabase.tmp
  echo "  Studio: http://127.0.0.1:54323"
}

setup_sentry() {
  ask "Run the Sentry Next.js wizard?" || return 0
  say "Sentry"
  npx @sentry/wizard@latest -i nextjs
  echo "  Add SENTRY_ORG and SENTRY_PROJECT as repo Variables; SENTRY_AUTH_TOKEN as a Secret."
}

setup_vercel() {
  ask "Link this project to Vercel?" || return 0
  say "Vercel"
  if ! command -v vercel >/dev/null 2>&1; then
    npm i -g vercel
  fi
  vercel link
}

next_steps() {
  cat <<EOF

\033[1;32m✓ Setup complete.\033[0m

Next steps:
  1. Open .env.local and fill any blank values.
  2. npm run dev → http://localhost:3000
  3. npm run db:push (after defining schema in src/db/schema/)
  4. Commit & push — CI runs typecheck/lint/test/build on every PR.

Dashboards (replace <project>):
  • Vercel:   https://vercel.com/frontenac-studios/<project>
  • Sentry:   https://frontenac-studios.sentry.io/projects/<project>/
  • Supabase: https://supabase.com/dashboard/project/<ref>

EOF
}

main() {
  rename_package
  install_deps
  seed_env
  setup_supabase
  setup_sentry
  setup_vercel
  next_steps
}

main "$@"
