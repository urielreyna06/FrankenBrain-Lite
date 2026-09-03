# FrankenBrain Lite

Packaged multi-harness AI work environment as a cloneable plugin.

## Structure
- `skills/` — shared workflow skills (each `<name>/SKILL.md`)
- `agents/` — agent definitions
- `commands/` — command definitions
- `rules/` — ECC coding rules (`common/` + `java/`)

## Security (HARD RULE)
- This repo contains ZERO credentials by design.
- Never add or stage `.env`, `.aws/`, `.npmrc`, `.bashrc`, `.browserstack.env`, `*.key`, `*.pem` or any private material.
- Always run `make security` before committing; CI enforces it.
