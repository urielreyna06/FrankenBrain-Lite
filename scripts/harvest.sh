#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APPLY=0
for a in "$@"; do
  [[ "$a" == "--apply" ]] && APPLY=1
done

run() {
  if [[ "$APPLY" -eq 1 ]]; then eval "$1"; else echo "[dry-run] $1"; fi
}

# Source roots (Harness). Adjust HOME-based paths as needed.
SRC_SKILLS="${FRANKENBRAIN_HARVEST_OPENCODE:-$HOME/.config/opencode/skills}"
SRC_AGENTS="${FRANKENBRAIN_HARVEST_AGENTS:-$HOME/.config/opencode/agent}"
SRC_COMMANDS="${FRANKENBRAIN_HARVEST_COMMANDS:-$HOME/.config/opencode/command}"
SRC_RULES="${FRANKENBRAIN_HARVEST_RULES:-$HOME/.claude/rules/ecc}"

# Copy whole top-level entries, preserving their internal structure
# (never `cp .../*`, which would flatten and break relative ../common refs).
echo "Harvesting skills from $SRC_SKILLS ..."
run "cp -rn '$SRC_SKILLS'/./ 'skills/'"

echo "Harvesting agents from $SRC_AGENTS ..."
run "cp -rn '$SRC_AGENTS'/./ 'agents/'"

echo "Harvesting commands from $SRC_COMMANDS ..."
run "cp -rn '$SRC_COMMANDS'/./ 'commands/'"

echo "Harvesting rules from $SRC_RULES ..."
run "cp -rn '$SRC_RULES'/./ 'rules/'"

echo "Harvest complete. Run 'make security' and 'make validate' before committing."
