---
name: using-dev
description: Always active this session — silently triage every task against the installed ECC baseline (skills, agents, commands, rules) plus superpowers, and route to whichever fits before acting. The human partner should never need to name a specific skill/agent/command.
---

# using-dev

You have the local ECC dev-environment baseline, in addition to superpowers. Two independent systems are installed and neither covers the other — treat them as complementary:

- **superpowers** — general process discipline: brainstorming, TDD, systematic debugging, writing/executing plans, git-worktree hygiene, parallel agent dispatch. Bootstraps itself via `using-superpowers`; that rule still applies in full.
- **ECC baseline** (this skill's job) — domain- and language-specific specialists: reviewer/build-resolver agents per language, planning/security/verification skills, slash commands, and a passive continuous-learning system.

Process skills set the approach (brainstorming before building, systematic-debugging before fixing); ECC specialists carry it out. Neither replaces the other.

## The rule

Before responding to any non-trivial task, silently triage it against the pools below and route to the best fit. Do this whether or not the task looks like it needs it — the cost of checking is one line, the cost of skipping it is reinventing something that already exists.

## Step 1 — the inventory is not static, re-check live

```bash
ls ~/.config/opencode/skills/
ls ~/.config/opencode/agent/
ls ~/.config/opencode/command/
# (OpenCode has no rules/ dir — see note below)
```

Do not trust a memorized list from an earlier session or an earlier point in this conversation — things get added and removed.

## Step 2 — triage

**Skills** (`~/.config/opencode/skills/*/SKILL.md`) — read the `description:` before invoking. ECC additions: `search-first`, `security-review`, `intent-driven-development`, `error-handling`, `growth-log`, `knowledge-ops`, `skill-scout`, `rules-distill`, `agent-introspection-debugging`, `context-budget`, `continuous-learning-v2`, `unified-memory`. If a skill might apply, use it — don't rationalize past it, same bar as `using-superpowers`.

**Agents** (`~/.config/opencode/agent/*.md`) — the roster was pruned to nine: `java-reviewer` and `java-build-resolver` (the only language pair kept), `security-reviewer` for anything touching auth/input/secrets, `code-reviewer`, `architect` for design questions, plus `docs-lookup`, `doc-updater`, `harness-optimizer`, `loop-operator`. Delegate when one of these matches; otherwise work inline.

**Process belongs to superpowers.** Planning, TDD, debugging and pre-completion verification are superpowers skills — `brainstorming`, `writing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`. The ECC equivalents (`planner`, `tdd-guide`, `verification-loop`) were removed precisely so there is no ambiguity: **superpowers sets the approach, ECC specialists carry it out.**

**Commands** (`~/.config/opencode/command/*.md`) — if the task maps onto an existing command's job (`plan`, `code-review`, `build-fix`, `refactor-clean`, `checkpoint`, `learn`, `update-docs`, `security-scan`, `instinct-status`/`export`/`import`, `promote`, `projects`, `evolve`), run that flow rather than reinventing it ad hoc.

**Rules** — OpenCode has no `rules/` directory; ECC's rule files live only under Claude Code. The project's own `AGENTS.md` is the authority here. When Java conventions matter, read `~/.claude/rules/ecc/java/` explicitly.

**Continuous learning** — `PreToolUse`/`PostToolUse` hooks and the background observer are already always-on, nothing to trigger. Instincts live in `~/.local/share/ecc-homunculus/`, shared with opencode on this machine. Check `/instinct-status` when it would help; use `/learn` or the `growth-log` skill after non-trivial or corrected work.

## Step 3 — announce, then act

One line before acting: `Using <skill/agent/command> to <purpose>.` If nothing in the baseline fits, say so and proceed with default judgment — this is a triage step, not a mandate to force-fit a tool that doesn't belong.
