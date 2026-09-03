#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_FILES=(
  "scripts/security-gate.sh"
  "test/fixtures/secret-file.txt"
  ".gitignore"
  "AGENTS.md"
  "CLAUDE.md"
)

SKIP_DIRS=(
  ".superpowers/"
  "docs/"
)

is_skipped() {
  local rel="$1"
  rel="${rel#./}"
  for s in "${SKIP_FILES[@]}"; do
    [[ "$rel" == "$s" ]] && return 0
  done
  for d in "${SKIP_DIRS[@]}"; do
    [[ "$rel" == "$d"* ]] && return 0
  done
  return 1
}

pattern_hits=0

check() {
  local label="$1" regex="$2"
  local out
  out="$(grep -rInE -- "$regex" . 2>/dev/null \
    | grep -v '^\./\.git/' \
    | grep -v '^\./test/fixtures/secret-file.txt' \
    || true )"
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    local rel="${line%%:*}"
    is_skipped "$rel" && continue
    echo "SECURITY [$label]: $line"
    pattern_hits=1
  done <<< "$out"
}

check "aws-access-key"       'AKIA[0-9A-Z]{16}'
check "private-key-block"    '-----BEGIN [A-Z ]*PRIVATE KEY-----'
check "browserstack-key"     'BROWSERSTACK_ACCESS_KEY\s*=\s*[^$\n]'
check "secret-env-assignment" 'AWS_SECRET_ACCESS_KEY\s*=\s*[^$\n]'
check "password-assignment"  '(password|passwd)\s*[=:]\s*["'\'' ]*[^ "#'\''$\n]{8,}'
check "api-key-assignment"   '(api[_-]?key|apikey)\s*[=:]\s*["'\'' ]*[^ "#'\''$\n]{8,}'
check "machine-secret-path"  '(~?/\.browserstack|\.browserstack\.env|/\.aws/|\.npmrc|secrets\.env)'

if [[ "$pattern_hits" -ne 0 ]]; then
  echo
  echo "SECURITY GATE FAILED: possible credentials detected (see above)."
  echo "Remove them before committing. If this is a false positive on a pattern"
  echo "description, add the file to SKIP_FILES in scripts/security-gate.sh."
  exit 1
fi

echo "SECURITY GATE PASS: no credential patterns detected."
exit 0
