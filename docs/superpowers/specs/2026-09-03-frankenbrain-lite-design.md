# FrankenBrain Lite — Design Spec

**Date:** 2026-09-03
**Status:** Draft for review

## Purpose

`FrankenBrain Lite` is a clonable Git repository that packages the user's
multi-harness AI work environment (OpenCode, Claude Code, Codex, Gemini/
Antigravity) plus ECC asset harvesting, shell config, and install scripts, so
the entire setup can be replicated to a new machine with a single command.

The name is a lightweight, portable subset of the user's full "FrankenBrain"
environment — enough to bootstrap a machine to a working state, without
carrying per-machine state (secrets, cloud SSO caches, the knowledge vault).

## Non-Goals (YAGNI)

- Not a new config framework or abstraction layer. It is a **snapshot +
  templating + deploy** of the current working setup.
- Does NOT package secrets, `.aws/` SSO caches, `.m2/` caches, `~/.nvm` binary
  installs, or the content of `~/vault/` (only its directory skeleton).
- Does NOT attempt to boot across radically different OSes; targets a
  Linux/WSL machine like the current one.

## Repository Layout

```
FrankenBrain-Lite/
├── README.md               # Usage, prerequisites, manual steps
├── install.sh              # Entry point: detect machine, deploy everything
├── bootstrap.sh            # Prereq install (curl, git, node/nvm, opencode, etc.)
├── Makefile                # Targets: install, dry-run, validate, update, harvest
├── .gitignore              # Never commit secrets / env reales / caches
├── .github/workflows/validate.yml   # CI: validate configs are parseable
│
├── config/
│   ├── opencode/           # opencode.jsonc + agent/, command/, skills/, plugin/
│   ├── claude/             # ~/.claude/ (settings.json, agents, skills, commands, hooks)
│   ├── codex/              # ~/.codex/ (config.toml, agents, rules, MCP)
│   ├── gemini/             # ~/.gemini/ config
│   ├── vault-structure/    # ~/vault/ skeleton: folders + README.md each
│   └── shell/              # .bashrc, .profile, .gitconfig, .npmrc (templated)
│
├── templates/
│   ├── browserstack.env.example
│   ├── zscaler.crt.example
│   └── secrets.env.example      # Lists every secret the setup needs
│
├── scripts/
│   ├── setup-env.sh        # Prompt/interactive for secrets, render templates
│   ├── harvest.sh          # Re-apply ECC asset harvest from ~/projects/ECC
│   └── validate.sh         # Local validation (no CI needed)
└── docs/
    └── superpowers/specs/  # This spec
```

## Components

### 1. `config/` — configuration snapshots

Each subtree mirrors the real destination directory. Files that contain secrets
use placeholder tokens that `scripts/setup-env.sh` substitutes at deploy time.

| Config dir | Deployed to | Contents |
|-----------|-------------|----------|
| `config/opencode/` | `~/.config/opencode/` | `opencode.jsonc`, `agent/`, `command/`, `skills/`, `plugin/` |
| `config/claude/` | `~/.claude/` | `settings.json`, `agents/`, `skills/`, `commands/`, `hooks/` |
| `config/codex/` | `~/.codex/` | `config.toml`, `agents/`, `rules/`, `mcp/` |
| `config/gemini/` | `~/.gemini/` | config files |
| `config/vault-structure/` | `~/vault/` | skeleton only (folders + README) |
| `config/shell/` | `~/` | `.bashrc`, `.profile`, `.gitconfig`, `.npmrc` (templated) |

### 2. `templates/` — secret templates

Never store real secrets. Each `*.example` documents the shape and a
`secrets.env.example` inventories every credential the environment needs
(BrowserStack username/key, corporate CA, AWS profile, GCP, etc.).

### 3. `scripts/`

- **`setup-env.sh`**: reads/creates a local `~/.frankenbrain/secrets.env`,
  prompts for any missing values, and renders `templates/*.example` into the
  real config files, substituting `__TOKEN__` placeholders.
- **`harvest.sh`**: re-applies the ECC asset harvest from `~/projects/ECC` into
  each harness tree using the copy-whole-directories pattern (never flattening
  with `cp .../*`, to preserve relative `../common/` references).
- **`validate.sh`**: local check that opencode config parses, JSON/YAML files
  are valid, and no placeholder token leaks into committed files.

### 4. Install flow

```
./install.sh [--dry-run]
  1. bootstrap.sh        # ensure git, curl, node/nvm, opencode, claude, codex, gemini
  2. clone/update ~/projects/ECC (source for harvest)
  3. setup-env.sh        # render templates with secrets
  4. deploy config/* to destinations (idempotent, never overwrite existing user files w/o backup)
  5. harvest.sh          # re-apply ECC assets
  6. validate.sh         # confirm nothing broke
```

Idempotent: re-running is safe. Always backs up any pre-existing destination
file before overwriting (`.frankenbrain.bak.<ts>`).

### 5. CI — `.github/workflows/validate.yml`

Runs `scripts/validate.sh` on push/PR to guarantee committed config is
parseable and secret-free. Triggers on `config/`, `scripts/`, `templates/`.
Checks:
- `opencode.jsonc` and any JSON/YAML/TOML parse correctly (opencode schema, yq).
- Grep for placeholder tokens `__[A-Z_]+__` in committed `config/` (expected in
  templates only) to catch accidental secrets/tokens.
- `shellcheck` on bash scripts.

## Secret Handling

- Real secrets (`.browserstack.env`, `.aws/`, `.npmrc`, `.bashrc` hardcoded
  creds, CA private key) are **never** committed.
- `.gitignore` lists: `*.env` (non-example), `.aws/`, `.bashrc` (if it held
  real creds at export time — instead ship a templated version), `*.key`,
  `*.pem`, `zscaler.crt`, backups.
- On the target machine, `setup-env.sh` collects secrets into
  `~/.frankenbrain/secrets.env` (itself gitignored / chmod 600).

## Error Handling

- `install.sh` aborts on any failed step with a clear message and rolls back
  created files if `--dry-run` was not used and the failure is structural.
- `setup-env.sh` fails fast with a list of missing secrets rather than
  continuing with blanks.
- Every script returns non-zero on failure and echoes the failing step.

## Testing / Verification

- `scripts/validate.sh` (runs in CI and locally) is the primary gate.
- Manual smoke test on target: run `./install.sh --dry-run` then `./install.sh`,
  then launch `opencode`, `claude`, `codex` and confirm they start with the
  harvested config.
- `Makefile validate` target runs the same checks.

## Risks / Open Items

- Corporate Zscaler CA: exporting it into the repo is a security decision. The
  spec ships a **placeholder** and the README documents the manual paste step
  on the target (avoids baking a corporate cert into a repo).
- `.bashrc` currently hardcodes some creds; the exported version uses templates.
- Machine-specific paths (JAVA_HOME, M2_HOME, nvm) differ; bootstrap.sh detects
  rather than assumes.
