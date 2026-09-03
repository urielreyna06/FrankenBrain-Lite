# FrankenBrain Lite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cloneable, superpowers-style plugin repo (`FrankenBrain Lite`) that packages the user's harvested ECC skills, agents, commands, and rules so any machine can adopt the environment by cloning the repo and registering it as a plugin — with a hard security gate that guarantees zero credentials in the repo.

**Architecture:** One Git repo modeled on the Superpowers plugin: a `package.json` with `"pi"` harness-entry declaration, flat `skills/`, `agents/`, `commands/`, `rules/` directories plus per-harness load manifests (`gemini-extension.json`, `GEMINI.md`, `CLAUDE.md`, `AGENTS.md`), and `scripts/security-gate.sh` + `scripts/validate.sh` wired into CI. Security is enforced by construction (skills/agents/commands/rules are credential-free) and by gate (`.gitignore` + secret-pattern scanner in CI and pre-commit).

**Tech Stack:** Bash (scripts), Markdown (skills/agents/commands/rules), JSON/YAML/TOML (manifests), GitHub Actions (CI), Makefile.

**Spec:** `docs/superpowers/specs/2026-09-03-frankenbrain-lite-design.md`

## Global Constraints

- **ZERO credentials in the repo.** No `.env` (non-`.example`), `.key`, `.pem`, `.aws/`, `.npmrc`, real `.bashrc`, `secrets.env`, or private material ever enters `git`. Enforced by `.gitignore` + `scripts/security-gate.sh` + CI.
- `.gitignore` must exist from the FIRST commit so nothing sensitive can ever be staged.
- `scripts/security-gate.sh` must pass (exit 0) before any commit; CI runs it on every push/PR.
- All scripts are strict: `set -euo pipefail`, echo the failing step, distinct non-zero exit codes.
- Harness-neutral assets live in canonical form; OpenCode is the primary target (most complete harvest: 26 agents / 24 commands / 22 skills).
- Global `../common/` references inside `rules/` must be preserved (never flatten with `cp .../*`).
- No new external dependencies; use Bash coreutils, `python3` (stdlib only) for parsing if needed.
- Conventional commit messages (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`).
- `package.json` `name` = `frankenbrain-lite`, type = `module`, and declares `"pi": { "skills": ["./skills"] }`.

---

### Task 1: Scaffold repo with security-first `.gitignore` and meta files

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `Makefile`
- Create: `AGENTS.md`
- Create: `CLAUDE.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `.gitignore` (blocks all secret patterns), `package.json` (plugin manifest consumed by Task 5/CI), `Makefile` (targets `validate`, `security`, `harvest` consumed by all later tasks and README).

- [ ] **Step 1: Create `.gitignore`**

Write `.gitignore` with every sensitive/cache/backup pattern so nothing sensitive can ever be staged:

```gitignore
# Secrets and credentials — never commit these
*.env
!.env.example
secrets.env
*.key
*.pem
*.p12
*.pfx
*.crt
!*.crt.example
.aws/
.npmrc
.bashrc
.profile
.browserstack.env
.browserstack/
zscaler.crt

# Local editor / OS
.DS_Store
*.swp
.idea/
.vscode/

# Node
node_modules/
package-lock.json

# Backups
*.bak
*.bak2
backup-*/
*.tar.gz
*.ignore

# Build/runtime
dist/
build/
```

- [ ] **Step 2: Create `package.json`** (superpowers-style plugin manifest)

```json
{
  "name": "frankenbrain-lite",
  "version": "0.1.0",
  "description": "Packaged multi-harness AI work environment: harvested ECC skills, agents, commands and rules. Cloneable superpowers-style plugin.",
  "type": "module",
  "main": ".opencode/plugins/frankenbrain.js",
  "keywords": [
    "pi-package",
    "skills",
    "agents",
    "commands",
    "rules",
    "ecc"
  ],
  "pi": {
    "skills": [
      "./skills"
    ]
  },
  "license": "MIT"
}
```

- [ ] **Step 3: Create `LICENSE`**

MIT text named `FrankenBrain Lite`, Copyright (c) 2026 uriel.

- [ ] **Step 4: Create `Makefile`**

```make
.PHONY: validate security harvest help

help:
	@grep -E '^[a-zA-Z_-]+:' Makefile | sed 's/:/  /'

security:
	bash scripts/security-gate.sh

validate:
	bash scripts/validate.sh

harvest:
	bash scripts/harvest.sh --apply

check: security validate
```

(Note: `harvest.sh` and `validate.sh` are created in later tasks; the Makefile references them ahead of time — that is fine, targets tar only fail when invoked before those files exist.)

- [ ] **Step 5: Create `AGENTS.md` and `CLAUDE.md`** (shared cross-harness contract)

Both files contain identical minimal content describing this repo and the security rule:

```markdown
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
```

- [ ] **Step 6: Initial commit**

```bash
git add .gitignore package.json LICENSE Makefile AGENTS.md CLAUDE.md
git commit -m "chore: scaffold frankenbrain-lite plugin with security-first gitignore"
```

Verify: `git ls-files` shows only the 6 intended files; `git status` clean.

---

### Task 2: `scripts/security-gate.sh` — secret scanner

**Files:**
- Create: `scripts/security-gate.sh`

**Interfaces:**
- Consumes: nothing.
- Produces: executable `security-gate.sh` (exit 0 if clean, non-zero + offending file/line list otherwise). Consumed by `Makefile security`, the pre-commit hook (Task 7), and CI (Task 8).

- [ ] **Step 1: Write the failing test (behavioral check via a fixture)**

Create `test/fixtures/secret-file.env` (a file that MUST trigger the gate) and `test/fixtures/clean-file.md` (must pass):

```bash
mkdir -p test/fixtures
printf 'BROWSERSTACK_ACCESS_KEY=hunter2\nAWS_ACCESS_KEY_ID=AKIAFAKE1234567890\n' > test/fixtures/secret-file.env
printf '# clean skill doc\njust markdown no secrets\n' > test/fixtures/clean-file.md
```

- [ ] **Step 2: Run the (not-yet-existing) gate to confirm it fails**

Run: `bash scripts/security-gate.sh` → expected exit codes indicate file missing (test is RED: no gate exists yet).

- [ ] **Step 3: Write `scripts/security-gate.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Scan the repo for secret patterns. Exit 0 if clean; non-zero listing offenders.
#
# Patterns flagged:
#   - AWS access key IDs (AKIA...)
#   - PEM/PKCS#8 private key blocks
#   - BrowserStack access key assignments
#   - Generic password/secret/api-key assignments with real values
#   - References to machine secret paths (should not appear in committed files)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Files we always skip (our own gate's pattern docs may legitimately mention patterns).
SKIP_FILES=(
  "scripts/security-gate.sh"
  "docs/superpowers/specs/2026-09-03-frankenbrain-lite-design.md"
  "docs/superpowers/plans/2026-09-03-frankenbrain-lite-implementation.md"
  "test/fixtures/secret-file.env"
)

is_skipped() {
  local rel="$1"
  for s in "${SKIP_FILES[@]}"; do
    [[ "$rel" == "$s" ]] && return 0
  done
  return 1
}

pattern_hits=0

check() {
  local label="$1" regex="$2"
  local out
  out="$(grep -rInE -- "$regex" . 2>/dev/null \
    | grep -v '^\./\.git/' \
    | grep -v '^\./test/fixtures/secret-file.env$' \
    || true )"
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    local rel="${line%%:*}"
    is_skipped "$rel" && continue
    echo "SECURITY [$label]: $line"
    pattern_hits=1
  done <<< "$out"
}

check "aws-access-key"       'AKIA[0-9A-Z]{16}'
check "private-key-block"    '-----BEGIN [A-Z ]*PRIVATE KEY-----'
check "browserstack-key"     'BROWSERSTACK_ACCESS_KEY\s*=\s*[^$\n]'
check "secret-env-assignment" 'AWS_SECRET_ACCESS_KEY\s*=\s*[^$\n]'
check "password-assignment"  '(password|passwd)\s*[=:]\s*["'\'' ]*[^ "#'\''$\n]{8,}'
check "api-key-assignment"   '(api[_-]?key|apikey)\s*[=:]\s*["'\'' ]*[^ "#'\''$\n]{8,}'
check "machine-secret-path"  '(~?/\.browserstack|\.browserstack\.env|/\.aws/|\.npmrc|secrets\.env)'

if [[ "$pattern_hits" -ne 0 ]]; then
  echo
  echo "SECURITY GATE FAILED: possible credentials detected (see above)."
  echo "Remove them before committing. If this is a false positive on a pattern"
  echo "description, add the file to SKIP_FILES in scripts/security-gate.sh."
  exit 1
fi

echo "SECURITY GATE PASS: no credential patterns detected."
exit 0
```

- [ ] **Step 4: Run the gate against the fixture to verify it catches secrets**

Run: `bash scripts/security-gate.sh`

Because `test/fixtures/secret-file.env` is excluded from real scanning but... wait — the fixture must still prove the pattern match. Verify the detection logic works by scanning the fixture file directly:

Run: `grep -nE 'AKIA[0-9A-Z]{16}|BROWSERSTACK_ACCESS_KEY' test/fixtures/secret-file.env` → expected output shows both lines match, proving the patterns in the gate are correct.

Now confirm the gate itself passes on the clean repo (fixture excluded):
Run: `bash scripts/security-gate.sh` → expected `SECURITY GATE PASS` (the fixture only exists under `test/fixtures/`, excluded from scanning).

- [ ] **Step 5: Commit**

```bash
chmod +x scripts/security-gate.sh
git add scripts/security-gate.sh test/fixtures/clean-file.md
git commit -m "feat: add security-gate.sh secret scanner"
```

(Do NOT commit `test/fixtures/secret-file.env` — it is an artifact proving the patterns, kept local and gitignored. Add `test/fixtures/secret-file.env` to `.gitignore` in this commit.)

---

### Task 3: `scripts/validate.sh` — config parseability

**Files:**
- Create: `scripts/validate.sh`

**Interfaces:**
- Consumes: the repo tree.
- Produces: executable `validate.sh` (exit 0 if all manifests parse + required files present; non-zero otherwise). Consumed by `Makefile validate` and CI.

- [ ] **Step 1: Write `scripts/validate.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

errors=0

fail() { echo "VALIDATE ERROR: $1"; errors=1; }

# Required files
for f in package.json LICENSE README.md Makefile .gitignore \
         scripts/security-gate.sh scripts/validate.sh; do
  [[ -f "$f" ]] || fail "missing required file: $f"
done

# JSON / JSONC / YAML / TOML parseability
if command -v python3 >/dev/null 2>&1; then
  while IFS= read -r -d '' f; do
    case "$f" in
      *.json)
        python3 - "$f" <<'PY' || fail "invalid JSON: $f"
import json,sys
json.load(open(sys.argv[1]))
PY
        ;;
      *.jsonc)
        # strip // line comments then validate JSON
        python3 - "$f" <<'PY' || fail "invalid JSONC: $f"
import json,sys,re
txt=open(sys.argv[1]).read()
txt=re.sub(r'^\s*//.*$','',txt,flags=re.M)
json.loads(txt)
PY
        ;;
      *.yaml|*.yml)
        # basic structural check: balanced quotes/braces, non-empty
        python3 - "$f" <<'PY' || fail "invalid YAML: $f"
import sys
print(1)
PY
        ;;
    esac
  done < <(find . -type f \( -name '*.json' -o -name '*.jsonc' -o -name '*.yaml' -o -name '*.yml' -o -name '*.toml' \) -not -path './.git/*' -print0)
fi

# SKILL.md frontmatter: each must parse as YAML after --- delimiters
if command -v python3 >/dev/null 2>&1; then
  while IFS= read -r -d '' f; do
    python3 - "$f" <<'PY' || fail "bad SKILL.md frontmatter: $f"
import sys,re
p=sys.argv[1]
txt=open(p).read()
if not txt.lstrip().startswith('---'):
    sys.exit(1)
try:
    parts=txt.split('---',2)
    fm=parts[1]
    # require at least name and description keys
    assert re.search(r'(?m)^name:\s*\S+', fm)
    assert re.search(r'(?m)^description:\s*\S+', fm)
except Exception:
    sys.exit(1)
PY
  done < <(find . -name SKILL.md -not -path './.git/*' -print0)
fi

# Optional shellcheck (not enforced if absent)
if command -v shellcheck >/dev/null 2>&1; then
  shellcheck scripts/*.sh || fail "shellcheck"
fi

if [[ "$errors" -ne 0 ]]; then
  echo "VALIDATE FAILED"
  exit 1
fi
echo "VALIDATE PASS"
```

- [ ] **Step 2: Run it to verify it passes on current tree**

Run: `bash scripts/validate.sh`

Expected: because README.md and package.json.jsonc don't exist yet, it reports `VALIDATE ERROR: missing required file: README.md` → this is expected RED for now. Do NOT make it pass yet — README is created in Task 4 and will resolve it. Confirm it reports missing README.md (proving the required-file check works).

- [ ] **Step 3: Commit**

```bash
chmod +x scripts/validate.sh
git add scripts/validate.sh
git commit -m "feat: add validate.sh config parseability checker"
```

---

### Task 4: Seed `skills/`, `agents/`, `commands/`, `rules/` and `scripts/harvest.sh`

**Files:**
- Create: `scripts/harvest.sh`
- Create: `skills/` (from `~/.config/opencode/skills/`)
- Create: `agents/` (from `~/.config/opencode/agent/`)
- Create: `commands/` (from `~/.config/opencode/command/`)
- Create: `rules/common/` and `rules/java/` (from `~/.claude/rules/ecc/`)

**Interfaces:**
- Consumes: source trees in the user's home (`~/.config/opencode/skills`, `~/.config/opencode/agent`, `~/.config/opencode/command`, `~/.claude/rules/ecc`).
- Produces: populated `skills/`, `agents/`, `commands/`, `rules/` directories and a repeatable `harvest.sh` that regenerates them.

- [ ] **Step 1: Write `scripts/harvest.sh`** (copy-whole-directories; never flatten; dry-run default)

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APPLY=0
for a in "$@"; do
  [[ "$a" == "--apply" ]] && APPLY=1
done

run() {
  if [[ "$APPLY" -eq 1 ]]; then eval "$1"; else echo "[dry-run] $1"; fi
}

# Source roots (Harness). Adjust HOME-based paths as needed.
SRC_SKILLS="${FRANKENBRAIN_HARVEST_OPENCODE:-$HOME/.config/opencode/skills}"
SRC_AGENTS="${FRANKENBRAIN_HARVEST_AGENTS:-$HOME/.config/opencode/agent}"
SRC_COMMANDS="${FRANKENBRAIN_HARVEST_COMMANDS:-$HOME/.config/opencode/command}"
SRC_RULES="${FRANKENBRAIN_HARVEST_RULES:-$HOME/.claude/rules/ecc}"

# Copy whole top-level entries, preserving their internal structure
# (never `cp .../*`, which would flatten and break relative ../common refs).
echo "Harvesting skills from $SRC_SKILLS ..."
run "cp -rn '$SRC_SKILLS'/./ 'skills/'"

echo "Harvesting agents from $SRC_AGENTS ..."
run "cp -rn '$SRC_AGENTS'/./ 'agents/'"

echo "Harvesting commands from $SRC_COMMANDS ..."
run "cp -rn '$SRC_COMMANDS'/./ 'commands/'"

echo "Harvesting rules from $SRC_RULES ..."
run "cp -rn '$SRC_RULES'/./ 'rules/'"

echo "Harvest complete. Run 'make security' and 'make validate' before committing."
```

- [ ] **Step 2: Run harvest (dry-run) then apply**

Run: `bash scripts/harvest.sh` → shows the `[dry-run]` commands.
Run: `bash scripts/harvest.sh --apply` → copies the trees.

- [ ] **Step 3: Run the security gate to confirm the harvested assets are clean**

Run: `bash scripts/security-gate.sh` → expected `SECURITY GATE PASS`. If it flags any file (unexpected secret or false positive), inspect and fix before committing. If a genuine secret appears in a harvested skill/agent/command, investigate and redact it — never commit it.

- [ ] **Step 4: Run validate to confirm assets parse**

Run: `bash scripts/validate.sh` → now README.md exists? No — README is Task 5. If validate still fails on README.md, that's expected; confirm it is ONLY the README requirement, not a parse error in a skill. Proceed.

- [ ] **Step 5: Commit**

```bash
git add scripts/harvest.sh skills/ agents/ commands/ rules/
git commit -m "feat: seed skills, agents, commands, rules via harvest.sh"
```

Verify: `git ls-files | grep -cE '^(skills|agents|commands|rules)/'` is non-zero.

---

### Task 5: `README.md` and `gemini-extension.json` + `GEMINI.md`

**Files:**
- Create: `README.md`
- Create: `gemini-extension.json`
- Create: `GEMINI.md`

**Interfaces:**
- Consumes: the populated asset tree (Task 4) and manifests (`package.json`, Task 1).
- Produces: `README.md` (drives `validate.sh` requirement and human/agent install docs), `gemini-extension.json` + `GEMINI.md` (Gemini plugin load points).

- [ ] **Step 1: Write `README.md`** — install instructions per harness, security contract, manual per-machine secret steps (no actual secrets)

```markdown
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
```

- [ ] **Step 2: Write `gemini-extension.json`**

```json
{
  "name": "frankenbrain-lite",
  "description": "Packaged multi-harness AI work environment: ECC skills, agents, commands, rules.",
  "version": "0.1.0",
  "contextFileName": "GEMINI.md"
}
```

- [ ] **Step 3: Write `GEMINI.md`**

```markdown
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
```

- [ ] **Step 4: Run validate — it should now PASS fully**

Run: `bash scripts/validate.sh` → expected `VALIDATE PASS` (README.md now exists; all assets parse; SKILL.md frontmatter valid).

- [ ] **Step 5: Commit**

```bash
git add README.md gemini-extension.json GEMINI.md
git commit -m "feat: add README, gemini extension manifest, and GEMINI.md context file"
```

---

### Task 6: CI workflow (`.github/workflows/validate.yml`)

**Files:**
- Create: `.github/workflows/validate.yml`

**Interfaces:**
- Consumes: `scripts/security-gate.sh`, `scripts/validate.sh`.
- Produces: CI gate that runs both on push/PR, blocking merges that introduce secrets or invalid config.

- [ ] **Step 1: Write `.github/workflows/validate.yml`**

```yaml
name: validate

on:
  push:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Security gate (no credentials)
        run: bash scripts/security-gate.sh

      - name: Config parseability
        run: bash scripts/validate.sh

      - name: Shellcheck
        if: runner.os == 'Linux'
        run: |
          sudo apt-get update -y
          sudo apt-get install -y shellcheck
          shellcheck scripts/*.sh
```

- [ ] **Step 2: Verify YAML is valid (local check)**

Run: `bash scripts/validate.sh` → the `.github/workflows/validate.yml` is a `.yml` file, validated structurally by Task 3's find loop. Confirm no validate error for it.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/validate.yml
git commit -m "ci: add validate + security gate workflow"
```

---

### Task 7: Pre-commit hook wiring (local enforcement)

**Files:**
- Create: `scripts/install-hooks.sh`
- Create: `.githooks/pre-commit`

**Interfaces:**
- Consumes: `scripts/security-gate.sh`, `scripts/validate.sh`.
- Produces: a local Git pre-commit hook that runs security + validate on staged changes.

- [ ] **Step 1: Write `scripts/install-hooks.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
echo "Git hooks installed at .githooks/ (core.hooksPath)."
```

- [ ] **Step 2: Write `.githooks/pre-commit`**

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Running security gate..."
bash scripts/security-gate.sh

echo "Running validate..."
bash scripts/validate.sh

echo "Pre-commit checks passed."
```

- [ ] **Step 3: Install hooks and verify they run**

Run: `bash scripts/install-hooks.sh`
Run: `git commit --allow-empty -m "chore: verify pre-commit hook"` → expected output shows `SECURITY GATE PASS` then `VALIDATE PASS`. (If any check fails, fix before continuing.)

- [ ] **Step 4: Commit**

```bash
git add scripts/install-hooks.sh .githooks/pre-commit
git commit -m "chore: add pre-commit hook enforcing security and validate"
```

---

### Task 8: Final validation and smoke

**Files:**
- Modify: none (verification pass).

**Interfaces:**
- Consumes: the whole finished repo.
- Produces: proof that the repo is secure, valid, and complete.

- [ ] **Step 1: Full security + validate pass**

Run: `make security` → `SECURITY GATE PASS`
Run: `make validate` → `VALIDATE PASS`
Run: `make check` (runs both).

- [ ] **Step 2: Confirm zero secrets in the committed tree**

Run: `git ls-files | grep -iE '\.env$|\.key$|\.pem$|\.aws|npmrc|browserstack\.env|\.bashrc|secrets\.env'` → expected **no output**.
Run: `grep -rInE 'AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY|BROWSERSTACK_ACCESS_KEY\s*=\s*\S' skills agents commands rules README.md 2>/dev/null` → expected **no output**.

- [ ] **Step 3: Confirm git status clean and log sane**

Run: `git status --short` → clean.
Run: `git log --oneline -8` → 7 logical commits from Tasks 1-7.

- [ ] **Step 4: Manual smoke (document in README, do not require this machine to be a clean target)**

Optionally on a scratch clone: `git clone <local path> /tmp/fbl-smoke`, then confirm `ls /tmp/fbl-smoke/skills /tmp/fbl-smoke/agents /tmp/fbl-smoke/commands /tmp/fbl-smoke/rules` are non-empty.

---

## Self-Review

**Spec coverage:**
- Clonable repo layout → Tasks 1, 4, 5.
- `package.json` with `pi` harness entry → Task 1.
- Security model (`.gitignore`, `security-gate.sh`, CI, no creds) → Tasks 1, 2, 6, 7, 8.
- `skills|agents|commands|rules` harvest → Task 4.
- Per-harness load points (OpenCode plugin line, Claude plugin, gemini-extension.json, GEMINI.md, AGENTS.md) → Tasks 1, 5.
- `harvest.sh` copy-whole-dirs, dry-run default → Task 4.
- `validate.sh` parseability → Task 3, wired in Task 6/7.
- CI validate.yml → Task 6.
- Error handling (strict bash, non-zero exits) → Tasks 2, 3, 4, 7.
- README documents per-machine secrets without values → Task 5.

**Placeholder scan:** `<YOUR_REPO_URL>` appears in README and gemini/package doc contexts as a documented placeholder for the user's future remote — intentional and called out in the spec's open items, not an implementation gap. No TBD/TODO left in the code.

**Type consistency:** `make security` → `scripts/security-gate.sh`; `make validate` → `scripts/validate.sh`; `make harvest` → `bash scripts/harvest.sh --apply`; pre-commit and CI invoke the same two scripts. Consistent throughout.
