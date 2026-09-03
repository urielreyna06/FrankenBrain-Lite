# FrankenBrain Lite

Packaged multi-harness AI work environment loaded as a plugin.

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
