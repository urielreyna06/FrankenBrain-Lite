# FrankenBrain Lite — Design Spec

**Date:** 2026-09-03
**Status:** Approved for planning

## Purpose

`FrankenBrain Lite` is a **cloneable plugin repository** modeled on the
Superpowers plugin pattern. It packages the user's multi-harness AI work
environment as a plugin that each harness (OpenCode, Claude Code, Codex,
Gemini/Antigravity) can load directly — contributing the harvested ECC skills,
agents, commands, and rules — so a new machine can adopt the same environment
by cloning the repo and registering it as a plugin.

The name is a lightweight, portable subset of the full "FrankenBrain"
environment: enough to give a machine the same *assistant capability*, without
carrying per-machine state (secrets, cloud SSO caches, the knowledge vault).

## Model: how this is like Superpowers

Superpowers is a single Git repo the agent harness loads as a plugin:

- **OpenCode:** one line in `opencode.jsonc` →
  `"plugin": ["superpowers@git+https://github.com/obra/superpowers.git"]`.
  The repo ships a `package.json` with `"pi": { "skills": [...], "extensions":
  [...] }` and a harness entry point (`.opencode/plugins/superpowers.js`).
- **Claude Code:** installed as a marketplace plugin in `settings.json`
  (`~/.claude/settings.json` → `"plugins"`), loading its `hooks/`, `skills/`,
  etc.
- **Gemini/Antigravity:** via `gemini-extension.json` + `GEMINI.md`
  (`contextFileName`).

FrankenBrain Lite replicates this: one repo, per-harness load points, and a
flat `skills/`, `agents/`, `commands/`, `rules/` layout the harnesses read
directly. **It does NOT copy personal config files to `~/.config/...` or
`~/.claude/` wholesale** — those carry machine-specific secrets.

## Security Model (hard gate)

The plugin repository **never contains credentials**. Guiding principle:
skills, agents, commands, and rules are credential-free by nature; secrets live
in the per-machine harness config (`opencode.jsonc`, `settings.json`,
`~/.browserstack.env`, `~/.aws/`), which are **not part of the plugin repo**.

Concrete rules, enforced by CI and a pre-commit gate:

- `.gitignore` blocks: `*.env` (non-`.example`), `*.key`, `*.pem`, `*.crt` with
  private material, `.aws/`, `.npmrc`, `.bashrc` (real), `secrets.env`,
  `*.ignore` files, backup dirs (`*.bak*`, `backup-*`).
- A `scripts/security-gate.sh` scans every staged/committed file for secret
  patterns (AWS access keys `AKIA...`, `BROWSERSTACK_ACCESS_KEY=`,
  `BEGIN PRIVATE KEY`, `password`/`token`=` actual values, `~/.browserstack`,
  `.browserstack.env` paths) and **aborts** on any hit.
- The gate runs locally (via `Makefile security` / a `pre-commit` hook) and in
  CI (~/.github/workflows/validate.yml).

## Repository Layout

```
FrankenBrain-Lite/
├── package.json              # npm metadata + "pi" harness entry declaration
├── README.md                 # Usage, install instructions per harness, manual steps
├── LICENSE                   # MIT
├── Makefile                  # Targets: install, validate, security, harvest
├── .gitignore                # Secret/cache/backup blockers (see Security Model)
├── .github/workflows/validate.yml   # CI: parseability + security-gate + shellcheck
├── scripts/
│   ├── security-gate.sh      # Secret-pattern scan (local + CI)
│   ├── validate.sh           # Parseability checks (local + CI)
│   └── harvest.sh            # Re-apply ECC asset harvest from ~/projects/ECC
│
├── gemini-extension.json     # Gemini/Antigravity plugin manifest
├── GEMINI.md                 # Gemini context file (contextFileName)
├── CLAUDE.md / AGENTS.md     # Cross-harness shared contract
│
├── skills/                   # Flat skill dirs (each: <name>/SKILL.md)
│   └── ...                   # Harvested ECC + superpowers-compatible skills
├── agents/                   # Agent definitions per harness schema
│   └── ...
├── commands/                 # Command definitions
│   └── ...
├── rules/                    # Coding rules (ECC common + java)
│   ├── common/
│   └── java/
└── docs/
    └── superpowers/specs/    # This spec
```

## Components

### 1. `skills/` — flat skill library

Each skill is a folder `<name>/SKILL.md`. These are the harvested ECC skills
(22 from OpenCode) and the shared workflow skills. Harness-agnostic markdown.

### 2. `agents/` and `commands/`

Agent/command definitions that each harness consumes. Because the frontmatter
schema differs per harness (OpenCode vs Claude vs Codex — see the known
frontmatter-adaptation lesson), agents/commands ship in the **canonical
harness-neutral form** plus per-harness variants under
`social/<harness>/` if needed. Default target: OpenCode schema (most complete
harvest at 26 agents / 24 commands), with a documented adaptation step.

### 3. `rules/`

The ECC coding rules: `rules/common/*.md` (code-review, coding-style, security,
testing) and `rules/java/*.md` (coding-style, hooks, patterns, security,
testing). Shared via `opencode.jsonc` `"instructions": [...]` on the target
machine and via Claude `settings.json`.

### 4. Harness load points

- **OpenCode:** user adds to `~/.config/opencode/opencode.jsonc` →
  `"plugin": ["frankenbrain-lite@git+https://<repo-url>.git"]` (npm-style) or a
  local path. The plugin's `package.json` `"pi.skills"` points at `skills/`, and
  agents/commands/skills are picked up from their standard locations.
- **Claude Code:** user adds the repo as a plugin source in `~/.claude/
  settings.json` (marketplace/plugin mechanism) pointing at this repo, loading
  its `skills/`, `agents/`, `rules/`, `hooks/`.
- **Gemini/Antigravity:** `gemini-extension.json` declares name/description/
  `contextFileName: GEMINI.md`; `GEMINI.md` points at the skill library.
- **Codex:** agents/rules exposed via the repo structure and `AGENTS.md`.

### 5. `scripts/`

- **`security-gate.sh`**: scans for secret patterns across the repo. Exit 0 if
  clean, non-zero listing the offending files/lines otherwise. Flags:
  `AKIA[0-9A-Z]{16}`, `BEGIN [A-Z ]*PRIVATE KEY`, `BROWSERSTACK_ACCESS_KEY=`,
  `password\s*=\s*[^$]`, `access[_-]?key` with long opaque values, references
  to `~/.browserstack.env` / `.aws/` / `.npmrc`, `.browserstack.env` in tree.
- **`validate.sh`**: parses every `*.json`/`*.jsonc`/`*.yaml`/`*.toml` and each
  `SKILL.md` frontmatter; confirms no `__TOKEN__` placeholder leaked outside
  known template contexts; confirms required files (package.json,
  README.md, LICENSE) exist.
- **`harvest.sh`**: regenerates/refreshes `skills/`, `agents/`, `commands/`,
  `rules/` from the ECC source (`~/projects/ECC`) using the copy-whole-directory
  pattern (never flatten with `cp .../*`), preserving relative `../common/`
  references. **Dry-run by default**; `--apply` writes.

### 6. CI — `.github/workflows/validate.yml`

Runs on push/PR touching `skills/`, `agents/`, `commands/`, `rules/`,
`scripts/`, `package.json`:
1. `bash scripts/security-gate.sh`
2. `bash scripts/validate.sh`
3. `shellcheck scripts/*.sh` (if shellcheck available)

## Secret Handling

- Repository contains **zero** credentials by construction: no `.env`,
  `.bashrc`, `.npmrc`, `.aws/`, `zscaler.crt`, or private keys.
- The **README** documents what the user must configure per machine (secret
  env files, BrowserStack creds, corporate CA, cloud SSO) without containing the
  values.
- Per-machine config (`opencode.jsonc` with secrets, `settings.json`) is
  managed on the machine, not in the repo.

## Error Handling

- `make validate`, `make security`, and CI all return non-zero and name the
  failing file/pattern when they fail.
- `harvest.sh` aborts on copy failure; never partially overwrites a skill dir
  without reporting it.
- Scripts are strict (`set -euo pipefail`), echo the failing step.

## Testing / Verification

- `make validate` + `make security` are the local gates (idempotent, fast).
- CI enforces the same.
- Manual smoke on a target machine: clone repo, register as plugin in opencode
  and claude, launch each harness, confirm skills/agents/commands appear.
- `harvest.sh --apply` followed by `make validate` proves no secrets were
  pulled in from ECC during a refresh.

## Risks / Open Items

- **Codex/Gemini load mechanics** are the least standardized; the initial
  release targets OpenCode + Claude Code fully, and exposes Codex/Gemini via
  AGENTS.md / gemini-extension.json as best-effort.
- The repo URL for the plugin reference is not yet set (no remote). Document
  the placeholder; user sets it on first `git remote add origin`.
- `harvest.sh` refreshes from `~/projects/ECC`; on a machine without ECC
  checked out, the plugin still works (assets are committed), harvest is only
  needed to refresh them.
