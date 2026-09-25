#!/usr/bin/env bash
# test/test-skill-neutrality.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
fail() { echo "SKILL NEUTRALITY TEST ERROR: $1" >&2; exit 1; }

matches="$(grep -rnE '~/\.(claude|config/opencode|codex|agents)/skills' skills commands agents || true)"
[[ -z "$matches" ]] || fail "harness skills paths found:
$matches"

for retired in brainstorming writing-plans test-driven-development systematic-debugging verification-before-completion using-dev; do
  [[ ! -e "skills/$retired" ]] || fail "retired skill still present: $retired"
done

[[ "$(find skills -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l)" -eq 32 ]] || fail "expected 32 skills"
[[ ! -e skills/.kiro ]] || fail "stray skills/.kiro present"
"$ROOT/bin/fbl" root | grep -qx "$ROOT" || fail "fbl root does not resolve the repository"
"$ROOT/bin/fbl" instinct --help >/dev/null 2>&1 || fail "fbl instinct is not runnable"
echo "SKILL NEUTRALITY TEST PASS"
