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
  timeout -k 30s "${FBL_OPENCODE_LOADER_TIMEOUT:-300s}" opencode debug skill >"$skills_output" || fail "OpenCode loader timed out or failed"

  for skill in growth-log search-first graphify; do
    grep -q "\"$skill\"" "$skills_output" || fail "OpenCode did not load skill: $skill"
  done
  echo "OPENCODE 1.18.32 SKILL LOAD PASS"
  agents_output="$TMP_ROOT/opencode-agents.txt"
  HOME="$TMP_ROOT/home" XDG_CONFIG_HOME="$TMP_ROOT/config" XDG_DATA_HOME="$TMP_ROOT/data" XDG_CACHE_HOME="$TMP_ROOT/cache" \
  OPENCODE_DISABLE_AUTOUPDATE=1 OPENCODE_DISABLE_MODELS_FETCH=1 OPENCODE_DISABLE_DEFAULT_PLUGINS=1 OPENCODE_DISABLE_PROJECT_CONFIG=1 \
  timeout -k 30s "${FBL_OPENCODE_LOADER_TIMEOUT:-300s}" opencode agent list >"$agents_output" || fail "OpenCode agent list failed"
  for agent in java-reviewer self-healer code-reviewer; do
    grep -q "^$agent (subagent)" "$agents_output" || fail "OpenCode did not register agent: $agent"
  done
  echo "OPENCODE AGENT REGISTRATION PASS"
else
  echo "OPENCODE SKILL LOAD SKIP: opencode is unavailable"
fi

python3 - "$ROOT" <<'PY' || fail "manifest contract"
import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
claude = json.loads((root / ".claude-plugin/plugin.json").read_text())
assert claude.get("agents") == [], "Claude manifest must ship agents: []"
codex = json.loads((root / ".codex-plugin/plugin.json").read_text())
assert codex["hooks"] == "./hooks/codex-hooks.json"
hooks = json.loads((root / "hooks/codex-hooks.json").read_text())["hooks"]
for event in ("SessionStart", "PreToolUse", "PostToolUse"):
    assert event in hooks, event
catalog = json.loads((root / ".agents/plugins/marketplace.json").read_text())
assert catalog["plugins"][0]["source"] == {"source": "local", "path": "./"}
claude_hooks = json.loads((root / "hooks/hooks.json").read_text())["hooks"]
assert "PostToolUse" in claude_hooks and "PreToolUse" in claude_hooks
PY
echo "MANIFEST CONTRACT PASS"

if command -v codex >/dev/null 2>&1; then
  codex_home="$TMP_ROOT/codex-home"; mkdir -p "$codex_home"
  CODEX_HOME="$codex_home" timeout -k 30s 120s codex plugin marketplace add "$ROOT" >/dev/null 2>&1 || fail "codex marketplace add failed"
  CODEX_HOME="$codex_home" timeout -k 30s 120s codex plugin add frankenbrain-lite@frankenbrain-lite >/dev/null 2>&1 || fail "codex plugin add failed"
  find "$codex_home/plugins/cache/frankenbrain-lite" -name SKILL.md -path '*growth-log*' | grep -q . || fail "codex cache lacks skills"
  echo "CODEX LOCAL MARKETPLACE INSTALL PASS"
fi
echo "CODEX MANIFEST STATIC VALIDATION: codex 0.154.0 has no local plugin validate command"
if command -v gemini >/dev/null 2>&1; then
  echo "GEMINI LIVE LOADER CHECK AVAILABLE BUT NOT AUTOMATED BY THIS STATIC CONTRACT"
else
  echo "GEMINI STATIC VALIDATION: skipped live loading because gemini is unavailable"
fi
