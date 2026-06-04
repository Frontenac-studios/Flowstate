#!/usr/bin/env bash
# Fail CI/pre-commit if public sign-up is re-enabled in repo config or login UI.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
config="$root/supabase/config.toml"
login="$root/src/app/login/LoginForm.tsx"

if grep -E '^\s*enable_signup\s*=\s*true' "$config"; then
  echo "error: enable_signup must be false in supabase/config.toml ([auth] and [auth.email])" >&2
  exit 1
fi

if grep -qE 'sign_up|signUp' "$login"; then
  echo "error: LoginForm must not expose sign-up (signInWithPassword only)" >&2
  exit 1
fi

echo "ok: public sign-up disabled in repo"
