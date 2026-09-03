<p align="center">
  <strong>🧠 FrankenBrain Lite</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/urielreyna06/FrankenBrain-Lite/actions"><img src="https://img.shields.io/github/actions/workflow/status/urielreyna06/FrankenBrain-Lite/validate.yml?branch=master" alt="CI"></a>
  <img src="https://img.shields.io/badge/harness-opencode%20%7C%20claude%20%7C%20gemini%20%7C%20codex-7c3aed" alt="Multi-harness">
</p>

<p align="center">
  <strong>Adopt the same multi-harness AI assistant environment on any machine —<br/>one clone, then plug into OpenCode, Claude Code, Gemini, and Codex.</strong>
</p>

<p align="center">
  <code>clone → register → harvest → secure</code>
</p>

---

**FrankenBrain Lite** packages your harvested ECC skills, agents, commands and
rules into a [superpowers-style](https://github.com/obra/superpowers) cloneable
plugin. Register it once per machine and every harness loads the same workflow
capability — no re-installing, no drift.

## What's inside

| Component | Count | Contents |
|-----------|:-----:|----------|
| `skills/` | 22 | Shared workflow skills (each `<name>/SKILL.md`) |
| `agents/` | 26 | Agent definitions (opencode / claude / marketplace) |
| `commands/` | 24 | Command definitions |
| `rules/` | 9 | ECC coding rules (`common/` + `java/`) |
| `scripts/` | 4 | `harvest`, `security-gate`, `validate`, `install-hooks` |
| CI | 1 | GitHub Actions `validate.yml` (security + validate + shellcheck) |

## Install

Pick your harness. A single command covers the common path; the
<details> blocks hold the per-harness manual details.

| Harness | Install |
|---------|---------|
| **OpenCode** | Add `"frankenbrain-lite@git+https://github.com/urielreyna06/FrankenBrain-Lite.git"` to the `plugin` array in `~/.config/opencode/opencode.jsonc`, then restart. |
| **Claude Code** | Add this repo as a plugin/marketplace source in `~/.claude/settings.json`. |
| **Gemini / Antigravity** | `gemini-extension.json` declares the plugin; `GEMINI.md` is the context file. |
| **Codex** | Clone the repo; reference `AGENTS.md` and `rules/` from your Codex config. |

<details>
<summary><b>OpenCode — manual steps</b></summary>

Add to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": [
    "frankenbrain-lite@git+https://github.com/urielreyna06/FrankenBrain-Lite.git"
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
</details>

<details>
<summary><b>Claude Code — manual steps</b></summary>

Add this repo as a plugin source in `~/.claude/settings.json` (plugins /
marketplace mechanism) pointing at `https://github.com/urielreyna06/FrankenBrain-Lite`.
It contributes `skills/`, `agents/`, `commands/`, `rules/`.
</details>

<details>
<summary><b>Gemini / Antigravity — manual steps</b></summary>

`gemini-extension.json` declares the plugin; `GEMINI.md` is the context file it
loads.
</details>

<details>
<summary><b>Codex — manual steps</b></summary>

Clone the repo; reference `AGENTS.md` and `rules/` from your Codex config.
</details>

## Start with what you need

| I want to… | Do this |
|------------|---------|
| Adopt the environment on a new machine | Clone + register (above), then `make check` |
| Refresh skills/agents/commands/rules from ECC | `make harvest` (dry-run by default, `--apply` to write) |
| Verify no secrets leaked into the repo | `make security` |
| Validate config + SKILL.md frontmatter | `make validate` |
| Enforce gates on commit | `make install-hooks` (runs on every commit) |

## Security contract (HARD)

> [!WARNING]
> **This repo must contain ZERO credentials — and it is now public.** Never add
> or stage `.env`, `.aws/`, `.npmrc`, `.bashrc`, `.browserstack.env`, `*.key`,
> `*.pem`, or any private material. If you believe a secret was committed,
> treat it as exposed, rotate it, and purge it from history immediately.

Per-machine secrets (BrowserStack, AWS SSO, corporate CA) are configured **on
each machine, never stored here**. Enforcement is mechanical, not by memory:

- `.gitignore` lists forbidden paths first.
- `scripts/security-gate.sh` scans the tree for 7 credential patterns.
- `make install-hooks` installs a pre-commit hook that runs the gate on every
  commit.
- CI (`validate.yml`) runs security + validate + shellcheck and fails the
  build on any violation.

### Per-machine manual steps (do this on each machine, not in the repo)

<details>
<summary><b>Privacy / secret setup</b></summary>

1. Configure cloud CLIs (AWS SSO, gcloud) locally.
2. Create `~/.browserstack.env` with your BrowserStack credentials
   (`chmod 600`).
3. Import your corporate CA into the system store and package managers.

</details>

## Development

```bash
make harvest        # refresh harvested ECC artifacts (dry-run; --apply to write)
make validate       # parse config + check SKILL.md frontmatter
make security       # scan for credentials (exit non-zero on any hit)
make check          # validate + security
make install-hooks  # install the pre-commit gate
```

Every commit runs the pre-commit gate; CI enforces the same checks on push.

## License

[MIT](LICENSE) © 2026 uriel

---

Built from a [superpowers](https://github.com/obra/superpowers)-style packaging
workflow. Security-conscious by construction.
