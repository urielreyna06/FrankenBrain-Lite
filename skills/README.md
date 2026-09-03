# Harvested ECC assets for OpenCode

These skills, agents, commands, and the learning plugin were harvested from
https://github.com/affaan-m/ECC (MIT licensed) to complement the superpowers
plugin without overlapping its workflow skills.

Source clone: `~/projects/ECC` (shallow, pinned to latest main at harvest time).

## Skills

### `~/.config/opencode/skills/`

- growth-log, knowledge-ops, skill-scout, rules-distill — remember -> improve loop (superpowers lacks this)
- search-first — research before coding
- security-review — security review checklist
- verification-loop — comprehensive pre-completion verification
- intent-driven-development — acceptance criteria before implementing
- error-handling — cross-language error handling patterns
- agent-introspection-debugging — structured self-debugging for agent failures
- context-budget — context window / config bloat audit
- cost-aware-llm-pipeline — model routing and LLM cost optimization
- continuous-learning-v2 — instinct-based learning; adapted for OpenCode (observation is captured by the `ecc-learning` plugin; instinct analysis is model-driven; CLI commands documented in SKILL.md)
- unified-memory — harness-agnostic memory vault (needs `ecc` CLI, see below)

## Runtime: `ecc-universal` npm package

Installed to `~/.local/node_modules/ecc-universal` (`npm install --prefix ~/.local ecc-universal`),
with bin symlinks in `~/.local/bin` (`ecc`, `ecc-memory-mcp`, `ecc-install`).
Provides the `ecc memory` vault used by the unified-memory skill.

Memory vault initialized at `~/.ecc/memory`.

## Plugin: continuous-learning (`~/.config/opencode/plugins/ecc-learning.ts`)

OpenCode-native equivalent of ECC's Claude hook runtime:

- `tool.execute.before` / `tool.execute.after` -> observations appended to
  `~/.local/share/ecc-homunculus/{observations.jsonl, projects/<hash>/observations.jsonl}`
  in exactly the same JSONL schema and project-hash scheme as ECC's `observe.sh`,
  so ECC's `instinct-cli.py` can consume them. Secret scrubbing included.
- `experimental.chat.system.transform` -> injects instincts + session context at
  session start (runs ECC's `scripts/hooks/session-start.js`; falls back to a
  direct instinct read).
- `event` on `session.idle` -> gated prompt to run instinct evolution
  (env: `ECC_OBSERVER_AUTO_EVOLVE`, `ECC_OBSERVER_EVOLVE_MIN_OBS`, `ECC_OBSERVER_EVOLVE_COOLDOWN_MIN`).

Env toggles: `ECC_HOOKS_ENABLED=false`, `ECC_OBSERVE=0`.

## Agents (`~/.config/opencode/agent/`)

25 subagents converted from `ECC/.opencode/prompts/agents/*.txt` (all Anthropic
model pins stripped, tools mirrored from `.opencode/opencode.json`):
planner, architect, code-reviewer, security-reviewer, tdd-guide,
build-error-resolver, e2e-runner, doc-updater, refactor-cleaner, docs-lookup,
harness-optimizer, loop-operator, database-reviewer, and reviewers/build-resolvers
for go, cpp, java, kotlin, php, python, rust.

## Commands (`~/.config/opencode/command/`)

- Core workflow: plan, tdd, code-review, security, build-fix, e2e,
  refactor-clean, verify, checkpoint, learn, update-docs
- continuous-learning CLI (paths adapted from Claude plugin roots to
  `~/.config/opencode/skills/continuous-learning-v2/scripts/instinct-cli.py`):
  instinct-status, instinct-export, instinct-import, promote, projects, evolve

## Deliberately excluded

- ECC's Claude-only hooks (`hooks/hooks.json`, `observe.sh` background observer)
  — replaced by the OpenCode plugin above
- ECC's `.opencode/opencode.json` model pins (`anthropic/*`) — not adopted;
  this machine uses its own providers
- tdd-workflow, brainstorming, plans, code-review, git-worktree equivalents —
  collide with superpowers' methodology

## Updating

These are copies, not the repo. To refresh from upstream:

    git -C ~/projects/ECC pull
    for s in growth-log knowledge-ops skill-scout rules-distill search-first security-review verification-loop intent-driven-development error-handling agent-introspection-debugging context-budget cost-aware-llm-pipeline continuous-learning-v2 unified-memory; do
      cp -r ~/projects/ECC/skills/$s ~/.config/opencode/skills/
    done

Re-apply the opencode path adaptations afterwards (grep for `~/.claude` in the
copied skills/commands, and re-run `bash /tmp/opencode/harvest-agents.sh` for
agents/commands).
