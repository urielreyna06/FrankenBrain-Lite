# FrankenBrain Lite

Cloneable, superpowers-style plugin packaging the harvested ECC skills,
agents, commands and rules — so any machine can adopt the same assistant
capability by cloning this repo and registering it as a plugin.

## Quick install (OpenCode)

Add to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": [
    "frankenbrain-lite@git+<YOUR_REPO_URL>.git"
  ]
}
```

or reference a local clone:

```jsonc
{
  "plugin": [
    "./path/to/FrankenBrain-Lite"
  ]
}
```

Then restart opencode.

## Install (Claude Code)

Add this repo as a plugin source in `~/.claude/settings.json` (plugins /
marketplace mechanism) pointing at `<YOUR_REPO_URL>`. It contributes
`skills/`, `agents/`, `commands/`, `rules/`.

## Install (Gemini / Antigravity)

`gemini-extension.json` declares the plugin; `GEMINI.md` is the context file it
loads.

## Install (Codex)

Clone the repo; reference `AGENTS.md` and `rules/` from your Codex config.

## Harness-agnostic layout

| Dir      | Contents                                             |
|----------|------------------------------------------------------|
| `skills/`  | Shared workflow skills (each `<name>/SKILL.md`)     |
| `agents/`  | Agent definitions                                   |
| `commands/`| Command definitions                                 |
| `rules/`   | ECC coding rules (`common/` + `java/`)              |

## Security contract (HARD)

- **This repo must contain ZERO credentials.** No `.env`, `.aws/`, `.npmrc`,
  `.bashrc`, `.browserstack.env`, `*.key`, `*.pem`, or private material.
- Per-machine secrets (BrowserStack, AWS SSO, corporate CA) are configured on
  each machine, never stored here.
- Always run `make security` and `make validate` before committing. CI enforces
  both.
- `make harvest` refreshes `skills/agents/commands/rules` from ECC
  (`~/.config/opencode/*`, `~/.claude/rules/ecc`). Run `make security` after
  every harvest before committing.

## Per-machine manual steps (do this on each machine, not in the repo)

1. Configure cloud CLIs (AWS SSO, gcloud) locally.
2. Create `~/.browserstack.env` with your BrowserStack credentials
   (`chmod 600`).
3. Import your corporate CA into the system store and package managers.
