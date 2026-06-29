#!/usr/bin/env bash
# Push test phone numbers + OTP 123456 to the linked Supabase project.
#
# Uses the Management API (auth config only) — avoids `supabase config push`,
# which can fail on Storage schema errors and overwrite redirect URLs.
#
# Requires SUPABASE_ACCESS_TOKEN (same token as `supabase login` uses):
#   https://supabase.com/dashboard/account/tokens
#
# Usage (from innoarcade/):
#   export SUPABASE_ACCESS_TOKEN=sbp_…
#   npm run setup:test-phones

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN."
  echo "Create one at https://supabase.com/dashboard/account/tokens"
  echo "Then: export SUPABASE_ACCESS_TOKEN=sbp_… && npm run setup:test-phones"
  exit 1
fi

node supabase/push-test-phones.mjs
