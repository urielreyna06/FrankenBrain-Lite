#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "WORKFLOW TEST ERROR: $1" >&2
  exit 1
}

assert_file() {
  [[ -f "$1" ]] || fail "missing $1"
}

assert_contains() {
  local file="$1"
  local pattern="$2"
  grep -Fq -- "$pattern" "$file" || fail "$file does not contain: $pattern"
}

assert_not_exists() {
  [[ ! -e "$1" ]] || fail "forbidden path exists: $1"
}

assert_json() {
  python3 -m json.tool "$1" >/dev/null || fail "invalid JSON: $1"
}

CORE_SKILLS=(
  brainstorming
  writing-plans
  test-driven-development
  systematic-debugging
  verification-before-completion
)

for skill in "${CORE_SKILLS[@]}"; do
  assert_file "skills/$skill/SKILL.md"
  assert_not_exists ".kiro/skills/$skill"
done

required_files=(
  rules/common/superpowers-workflow.md
  rules/common/persistent-memory.md
  .opencode/plugins/frankenbrain.js
  .claude-plugin/plugin.json
  .claude-plugin/marketplace.json
  .codex-plugin/plugin.json
  plugin.json
  hooks/hooks.json
  hooks/session-start
  hooks/run-hook.cmd
)

for file in "${required_files[@]}"; do
  assert_file "$file"
done

for skill in "${CORE_SKILLS[@]}"; do
  assert_contains rules/common/superpowers-workflow.md "$skill"
done

assert_contains rules/common/persistent-memory.md FRANKENBRAIN_VAULT_ROOT
assert_contains rules/common/persistent-memory.md user
assert_contains rules/common/persistent-memory.md memory/handoffs/CURRENT.md

assert_contains AGENTS.md brainstorming
assert_contains AGENTS.md verification-before-completion
assert_contains CLAUDE.md '@rules/common/superpowers-workflow.md'
assert_contains CLAUDE.md '@rules/common/persistent-memory.md'
assert_contains GEMINI.md '@./rules/common/superpowers-workflow.md'
assert_contains GEMINI.md '@./rules/common/persistent-memory.md'

python3 - <<'PY' || fail "gemini-extension.json contextFileName must equal GEMINI.md"
import json

with open("gemini-extension.json", encoding="utf-8") as handle:
    manifest = json.load(handle)
raise SystemExit(0 if manifest.get("contextFileName") == "GEMINI.md" else 1)
PY

for documentation in README.md docs/memory-wsl.md; do
  assert_file "$documentation"
  assert_contains "$documentation" FRANKENBRAIN_VAULT_ROOT
  assert_contains "$documentation" ECC_MEMORY_ALLOW_USER_SCOPE
  assert_contains "$documentation" ECC_MEMORY_USER_ROOT
  assert_contains "$documentation" memory/handoffs/CURRENT.md
  assert_contains "$documentation" 'OpenCode 1.18.32'
  assert_contains "$documentation" 'Gemini static validation'
done
assert_contains README.md 'skills-36'
assert_contains README.md '| [`skills/`](skills) | 36 |'

private_path_matches="$({
  linux_home_pattern='/home/'"uriel"
  windows_home_pattern='C:\\Users\\[[:alnum:]_][[:alnum:]_.-]*\\'
  rg -n --hidden \
    --glob '!.git/**' \
    --glob '!.ecc/**' \
    --glob '!graphify-out/**' \
    --glob '!docs/audits/**' \
    --glob '!docs/superpowers/plans/**' \
    --glob '!docs/superpowers/specs/**' \
    -e "$linux_home_pattern" \
    -e "$windows_home_pattern" \
    . || true
})"
[[ -z "$private_path_matches" ]] || fail "distributable files contain a personal path: $private_path_matches"

echo "WORKFLOW INTEGRATION PASS"
