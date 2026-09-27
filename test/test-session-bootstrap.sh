#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

fail() {
  echo "SESSION BOOTSTRAP TEST ERROR: $1" >&2
  exit 1
}

missing_output="$TMP_ROOT/missing.json"
CLAUDE_PLUGIN_ROOT="$TMP_ROOT/untrusted-plugin-root" \
FRANKENBRAIN_VAULT_ROOT= \
bash "$ROOT/hooks/session-start" >"$missing_output"

python3 -m json.tool "$missing_output" >/dev/null || fail "missing-vault output is not JSON"
for expected in brainstorming writing-plans test-driven-development systematic-debugging requesting-code-review verification-before-completion handoffs-index learn-eval; do
  grep -q "$expected" "$missing_output" || fail "missing workflow name: $expected"
done
grep -q '"hookSpecificOutput"' "$missing_output" || fail "missing hookSpecificOutput"

codex_output="$TMP_ROOT/codex.json"
env -u CLAUDE_PLUGIN_ROOT PLUGIN_ROOT="$TMP_ROOT/codex-plugin" CLV2_HOMUNCULUS_DIR="$TMP_ROOT/homunculus" \
  FRANKENBRAIN_VAULT_ROOT= bash "$ROOT/hooks/session-start" >"$codex_output"
python3 -m json.tool "$codex_output" >/dev/null || fail "codex output is not JSON"
grep -q 'Harness: codex' "$codex_output" || fail "codex harness not detected"
grep -qi "shared memory unavailable" "$missing_output" || fail "missing unavailable-memory status"

vault_root="$TMP_ROOT/vault"
mkdir -p "$vault_root/memory/handoffs"
printf '%s\n' 'PRIVATE-VAULT-CONTRACT-SENTINEL' >"$vault_root/AGENTS.md"
printf '%s\n' 'PRIVATE-HANDOFF-SENTINEL' >"$vault_root/memory/handoffs/CURRENT.md"

available_output="$TMP_ROOT/available.json"
CLAUDE_PLUGIN_ROOT="$TMP_ROOT/untrusted-plugin-root" \
FRANKENBRAIN_VAULT_ROOT="$vault_root" \
bash "$ROOT/hooks/session-start" >"$available_output"

python3 -m json.tool "$available_output" >/dev/null || fail "available-vault output is not JSON"
grep -Fq "$vault_root/AGENTS.md" "$available_output" || fail "vault contract path not exposed"
grep -Fq "$vault_root/memory/handoffs/CURRENT.md" "$available_output" || fail "handoff index path not exposed"
if grep -Eq 'PRIVATE-VAULT-CONTRACT-SENTINEL|PRIVATE-HANDOFF-SENTINEL' "$available_output"; then
  fail "private vault file body was injected"
fi

wrapper_error="$TMP_ROOT/wrapper-error.txt"
if bash "$ROOT/hooks/run-hook.cmd" >"$wrapper_error" 2>&1; then
  fail "hook wrapper accepted a missing script name"
fi
grep -q "missing script name" "$wrapper_error" || fail "hook wrapper error was not explicit"

echo "SESSION BOOTSTRAP TEST PASS"
