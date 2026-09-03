#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SCRIPT="$ROOT/scripts/security-gate.sh"
SECRET="$ROOT/test/fixtures/secret-file.txt"
CLEAN="$ROOT/test/fixtures/clean-file.md"

failures=0

echo "--- Test: detection patterns match secret-file.txt ---"

if grep -nE 'AKIA[0-9A-Z]{16}' "$SECRET"; then
  echo "PASS: aws-access-key pattern matched"
else
  echo "FAIL: aws-access-key pattern did NOT match"
  failures=$((failures + 1))
fi

if grep -nE 'BROWSERSTACK_ACCESS_KEY\s*=\s*[^$]' "$SECRET"; then
  echo "PASS: browserstack-key pattern matched"
else
  echo "FAIL: browserstack-key pattern did NOT match"
  failures=$((failures + 1))
fi

if grep -nE '(password|passwd)\s*[=:]\s*["'\'' ]*[^ "#'\''$\n]{8,}' "$SECRET"; then
  echo "PASS: password-assignment pattern matched"
else
  echo "FAIL: password-assignment pattern did NOT match"
  failures=$((failures + 1))
fi

echo ""
echo "--- Test: clean-file.md does NOT match any patterns ---"

if grep -nE 'AKIA[0-9A-Z]{16}|BROWSERSTACK_ACCESS_KEY|private.key.block|AWS_SECRET_ACCESS_KEY' "$CLEAN"; then
  echo "FAIL: clean-file matched a secret pattern"
  failures=$((failures + 1))
else
  echo "PASS: clean-file has no secret matches"
fi

echo ""
echo "--- Test: gate passes on clean repo (fixture excluded) ---"

if bash "$SCRIPT"; then
  echo "PASS: security-gate.sh exited 0 on clean repo"
else
  echo "FAIL: security-gate.sh did NOT exit 0 on clean repo"
  failures=$((failures + 1))
fi

echo ""
if [[ "$failures" -eq 0 ]]; then
  echo "All tests passed."
  exit 0
else
  echo "FAILED: $failures assertion(s) failed"
  exit 1
fi
