# FrankenBrain Lite — Kiro Harness

Packaged multi-harness AI work environment loaded into the Kiro IDE via `.kiro/`.

## How Kiro consumes this plugin

Kiro does not auto-discover a repo's top-level `skills/`, `agents/`, `commands/`,
and `rules/` folders the way OpenCode or Claude Code do. Instead it reads from a
`.kiro/` directory in the workspace root. This plugin bridges the two:

| Plugin source | Kiro surface | Mechanism |
|---------------|--------------|-----------|
| `rules/common/*` | `.kiro/steering/*.md` | Always-included steering, pulled in via `#[[file:...]]` references |
| `skills/<name>/SKILL.md` | `.kiro/steering/frankenbrain.md` catalog + `.kiro/skills/` | Cataloged so Kiro can route to the right workflow |
| `agents/*.md` | `.kiro/steering/frankenbrain.md` catalog | Documented so Kiro knows which specialist to invoke |
| `commands/*.md` | `.kiro/steering/frankenbrain.md` catalog | Documented as intent triggers |
| MCP servers | `.kiro/settings/mcp.json` | Workspace-level MCP config (empty by default) |

## Structure
- `skills/` — shared workflow skills (each `<name>/SKILL.md`)
- `agents/` — specialist agent definitions
- `commands/` — command / intent definitions
- `rules/` — ECC coding rules (always loaded via steering)
- `.kiro/steering/` — Kiro steering entrypoint (this harness)
- `.kiro/settings/mcp.json` — Kiro MCP configuration

## Install (Kiro)

1. Open the repository as a workspace folder in Kiro. The active workspace can be
   the project root **or** the `skills/` folder — a live `.kiro/` is provided in
   both locations.
2. Kiro loads `.kiro/steering/*.md` automatically (always-included steering).
3. Optionally register MCP servers by editing `.kiro/settings/mcp.json` (workspace)
   or `~/.kiro/settings/mcp.json` (user-global).
4. Restart or reconnect steering from the Kiro feature panel if you edit configs.

## Security (HARD RULE)
- Contains ZERO credentials by design.
- Never add or commit `.env`, `.aws/`, `.npmrc`, `.bashrc`,
  `.browserstack.env`, `*.key`, `*.pem`, or private material.
- Run `make security` before committing; CI enforces it.
