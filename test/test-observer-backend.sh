#!/usr/bin/env bash
# test/test-observer-backend.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CMD="$ROOT/skills/continuous-learning-v2/agents/analyzer-command.sh"
fail() { echo "OBSERVER BACKEND TEST ERROR: $1" >&2; exit 1; }

claude_argv="$(bash "$CMD" claude "" 10 /tmp/h | tr '\n' ' ')"
[[ "$claude_argv" == "claude --model haiku --max-turns 10 --print --allowedTools Read,Write -p " ]] || fail "claude argv: $claude_argv"
codex_argv="$(bash "$CMD" codex "" 10 /tmp/h | tr '\n' ' ')"
[[ "$codex_argv" == "codex exec --skip-git-repo-check --ephemeral -m gpt-5.6-luna --sandbox workspace-write -C /tmp/h " ]] || fail "codex argv: $codex_argv"
[[ "$(bash "$CMD" codex gpt-x 10 /tmp/h | sed -n 6p)" == "gpt-x" ]] || fail "model override ignored"
if bash "$CMD" nope "" 10 /tmp/h 2>/dev/null; then fail "unknown backend accepted"; fi
grep -q 'analyzer-command.sh' "$ROOT/skills/continuous-learning-v2/agents/observer-loop.sh" || fail "observer-loop does not use analyzer-command.sh"
python3 -c "import json,sys; m=json.load(open(sys.argv[1]))['observer']['models']; assert m=={'claude':'haiku','codex':'gpt-5.6-luna','opencode':'session'}, m" "$ROOT/skills/continuous-learning-v2/config.json" || fail "config models"
echo "OBSERVER BACKEND TEST PASS"
