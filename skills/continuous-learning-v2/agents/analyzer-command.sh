#!/usr/bin/env bash
# Prints the observer analyzer argv, one element per line, for the given backend.
# The caller appends the prompt as the final argument.
set -euo pipefail
backend="${1:?backend}"
model="${2:-}"
max_turns="${3:-10}"
workdir="${4:?workdir}"
case "$backend" in
  claude) printf '%s\n' claude --model "${model:-haiku}" --max-turns "$max_turns" --print --allowedTools "Read,Write" -p ;;
  codex) printf '%s\n' codex exec --skip-git-repo-check --ephemeral -m "${model:-gpt-5.6-luna}" --sandbox workspace-write -C "$workdir" ;;
  *) echo "unknown observer backend: $backend" >&2; exit 2 ;;
esac
