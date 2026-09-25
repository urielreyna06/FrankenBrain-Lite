# FrankenBrain Lite

Packaged multi-harness AI work environment loaded as a plugin.

@./rules/common/frankenbrain-workflow.md
@./rules/common/persistent-memory.md

## Install

Run `make install` once (Claude Code, OpenCode, Codex); after editing the repo run `make update`.
The workflow lives in `rules/common/frankenbrain-workflow.md`.

## Structure
- `skills/` — shared workflow skills (each `<name>/SKILL.md`)
- `agents/` — agent definitions
- `commands/` — command definitions
- `rules/` — ECC coding rules

## Security (HARD RULE)
- Contains ZERO credentials by design.
- Never add or commit `.env`, `.aws/`, `.npmrc`, `.bashrc`,
  `.browserstack.env`, `*.key`, `*.pem`, or private material.
- Run `make security` before committing; CI enforces it.
