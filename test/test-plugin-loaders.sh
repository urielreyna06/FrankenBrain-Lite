#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

fail() {
  echo "PLUGIN LOADER TEST ERROR: $1" >&2
  exit 1
}

if command -v claude >/dev/null 2>&1; then
  claude plugin validate "$ROOT" >/dev/null || fail "Claude plugin validation failed"
  echo "CLAUDE PLUGIN VALIDATION PASS"
else
  echo "CLAUDE PLUGIN VALIDATION SKIP: claude is unavailable"
fi

config_root="$TMP_ROOT/config/opencode"
mkdir -p "$config_root" "$TMP_ROOT/home" "$TMP_ROOT/data" "$TMP_ROOT/cache"
plugin_url="file://$ROOT/.opencode/plugins/frankenbrain.js"
printf '{\n  "plugin": ["%s"]\n}\n' "$plugin_url" >"$config_root/opencode.json"

if command -v opencode >/dev/null 2>&1; then
  skills_output="$TMP_ROOT/opencode-skills.txt"
  HOME="$TMP_ROOT/home" \
  XDG_CONFIG_HOME="$TMP_ROOT/config" \
  XDG_DATA_HOME="$TMP_ROOT/data" \
  XDG_CACHE_HOME="$TMP_ROOT/cache" \
  OPENCODE_DISABLE_AUTOUPDATE=1 \
  OPENCODE_DISABLE_MODELS_FETCH=1 \
  OPENCODE_DISABLE_DEFAULT_PLUGINS=1 \
  OPENCODE_DISABLE_PROJECT_CONFIG=1 \
  timeout "${FBL_OPENCODE_LOADER_TIMEOUT:-300s}" opencode debug skill >"$skills_output" || fail "OpenCode loader timed out or failed"

  for skill in brainstorming writing-plans test-driven-development systematic-debugging verification-before-completion; do
    grep -q "\"$skill\"" "$skills_output" || fail "OpenCode did not load skill: $skill"
  done
  echo "OPENCODE 1.18.32 SKILL LOAD PASS"
else
  echo "OPENCODE SKILL LOAD SKIP: opencode is unavailable"
fi

echo "CODEX MANIFEST STATIC VALIDATION: codex 0.154.0 has no local plugin validate command"
if command -v gemini >/dev/null 2>&1; then
  echo "GEMINI LIVE LOADER CHECK AVAILABLE BUT NOT AUTOMATED BY THIS STATIC CONTRACT"
else
  echo "GEMINI STATIC VALIDATION: skipped live loading because gemini is unavailable"
fi
