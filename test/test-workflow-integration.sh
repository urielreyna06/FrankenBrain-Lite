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
  [[ ! -e "skills/$skill" ]] || fail "retired skill present: $skill"
  assert_not_exists ".kiro/skills/$skill"
done
assert_not_exists ".kiro/skills/.kiro"

required_files=(
  rules/common/frankenbrain-workflow.md
  lib/bootstrap.mjs
  hooks/session-start.mjs
  harness/facts.json
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
  assert_contains rules/common/frankenbrain-workflow.md "$skill"
done

assert_contains rules/common/persistent-memory.md FRANKENBRAIN_VAULT_ROOT
assert_contains rules/common/persistent-memory.md user
assert_contains rules/common/persistent-memory.md memory/handoffs/CURRENT.md

assert_contains AGENTS.md brainstorming
assert_contains AGENTS.md verification-before-completion
assert_contains AGENTS.md rules/common/frankenbrain-workflow.md
assert_contains CLAUDE.md '@rules/common/frankenbrain-workflow.md'
assert_contains CLAUDE.md '@rules/common/persistent-memory.md'
assert_contains GEMINI.md '@./rules/common/frankenbrain-workflow.md'
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
assert_contains README.md 'skills-32'
assert_contains README.md '| [`skills/`](skills) | 32 |'

private_path_matches="$({
  linux_home_pattern='/home/'"uriel"
  windows_home_pattern='C:\\Users\\[[:alnum:]_][[:alnum:]_.-]*\\'
  git ls-files -z --cached --others --exclude-standard \
    | grep -z -v -E '^(\.git|\.ecc|graphify-out|docs/audits|docs/superpowers/(plans|specs))/' \
    | xargs -0 -r grep -n -I -E -e "$linux_home_pattern" -e "$windows_home_pattern" -- || true
})"
[[ -z "$private_path_matches" ]] || fail "distributable files contain a personal path: $private_path_matches"

for context_file in CLAUDE.md GEMINI.md; do
  while IFS= read -r import_path; do
    [[ -e "${import_path#./}" ]] || fail "$context_file imports a missing file: $import_path"
  done < <(sed -n 's/^@\(.*\)$/\1/p' "$context_file")
done
assert_not_exists scripts/harvest.sh
assert_contains README.md 'make install'
assert_contains README.md 'make verify-install'
assert_contains README.md 'agents-27'
assert_contains README.md '| [`skills/`](skills) | 32 |'
if grep -q '^harvest:' Makefile; then fail "Makefile still has a harvest target"; fi

SCOUT=skills/skill-scout/SKILL.md
for marker in 'Decision Matrix' 'Gap Analysis' 'Reuse existing' 'Improve existing' 'Create new' 'commands' 'agents' 'hooks' 'instincts' 'Risk'; do
  assert_contains "$SCOUT" "$marker"
done
for missing in skill-stocktake agent-sort; do
  if grep -Fq "$missing" "$SCOUT"; then fail "$SCOUT references nonexistent skill: $missing"; fi
done
assert_contains commands/learn-eval.md 'skill-scout'

echo "WORKFLOW INTEGRATION PASS"
