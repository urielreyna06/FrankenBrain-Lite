# Task 2 Report: `scripts/security-gate.sh` — Secret Scanner

**Status:** DONE
**Branch:** sdd/frankenbrain-lite

## Files Created

- `scripts/security-gate.sh` — executable secret scanner (exit 0 clean, exit 1 with offender list)
- `test/fixtures/secret-file.txt` — fake secrets for pattern detection testing
- `test/fixtures/clean-file.md` — safe content for negative testing
- `test/test-security-gate.sh` — automated behavioral test proving detection works

## Design Decisions

**Controller ruling applied:** Used `.txt` extension for the secret fixture (`.env` is gitignored by Task 1). All credential values are fake (`hunter2value1`, `AKIAFAKE1234567890AB`, `superSecretPass123`).

**SKIP_DIRS introduced:** The gate skips `.superpowers/` and `docs/` directories entirely — these contain design specs and implementation plans that reference pattern descriptions (e.g., `BROWSERSTACK_ACCESS_KEY=`, `.browserstack.env` paths). These are documentation about the patterns, not actual secrets.

**is_skipped strips `./` prefix:** grep output paths start with `./`, so the function strips this prefix before matching against SKIP_FILES entries.

**7 patterns scanned:**
- AWS access key IDs (`AKIA[0-9A-Z]{16}`)
- PEM/PKCS#8 private key blocks
- BrowserStack key assignments
- AWS secret access key assignments
- Generic password/passwd assignments (8+ chars)
- API key assignments (8+ chars)
- Machine secret path references (`.browserstack.env`, `.aws/`, `.npmrc`, `secrets.env`)

## Verification Output

### 1. `bash test/test-security-gate.sh` → exit 0

```
--- Test: detection patterns match secret-file.txt ---
2:AWS_ACCESS_KEY_ID=AKIAFAKE1234567890AB
PASS: aws-access-key pattern matched
1:BROWSERSTACK_ACCESS_KEY=hunter2value1
PASS: browserstack-key pattern matched
3:password: superSecretPass123
PASS: password-assignment pattern matched

--- Test: clean-file.md does NOT match any patterns ---
PASS: clean-file has no secret matches

--- Test: gate passes on clean repo (fixture excluded) ---
SECURITY GATE PASS: no credential patterns detected.
PASS: security-gate.sh exited 0 on clean repo

All tests passed.
```

### 2. `bash scripts/security-gate.sh` → exit 0

```
SECURITY GATE PASS: no credential patterns detected.
```

### 3. `git ls-files` — fixtures + scripts present as untracked

```
.gitignore
AGENTS.md
CLAUDE.md
LICENSE
Makefile
docs/superpowers/plans/2026-09-03-frankenbrain-lite-implementation.md
docs/superpowers/specs/2026-09-03-frankenbrain-lite-design.md
package.json
```

`git status` shows `scripts/` and `test/` as untracked (ready to commit).

## Commit

Staged files: `scripts/security-gate.sh`, `test/fixtures/secret-file.txt`, `test/fixtures/clean-file.md`, `test/test-security-gate.sh`
Commit message: `feat: add security-gate.sh secret scanner + detection test`

## Fix Round 1

**Commit:** `f4b0de6` — `fix: harden security-gate patterns and expand detection test coverage`

### What changed

| Finding | Fix |
|---------|-----|
| **F1** Redundant double-exclusion of test fixture | Removed `grep -v '^\./test/fixtures/secret-file.txt'` from `check()`. Exclusion now handled solely by `SKIP_FILES`/`is_skipped`. Added `test/test-security-gate.sh` to `SKIP_FILES` (its own grep lines contain the secret-path patterns, causing a self-match). |
| **F2** Test coverage gap (4 patterns untested) | Extended `test/fixtures/secret-file.txt` with 4 fake lines: `-----BEGIN FAKE PRIVATE KEY-----` block, `AWS_SECRET_ACCESS_KEY=fakesecretkey...`, `apikey: fakeapikeyvalue...`, and a line referencing `~/.browserstack`/`secrets.env`. Added 4 matching `grep` assertions in `test/test-security-gate.sh`. Also fixed the private-key `grep` call to use `--` (prevents `-----` being parsed as an option). |
| **F3** `[^\n]` ineffective in grep regex | Simplified `BROWSERSTACK_ACCESS_KEY` and `AWS_SECRET_ACCESS_KEY` patterns from `[^$\n]` to `[^$]`. |

### New test output — `bash test/test-security-gate.sh`

```
--- Test: detection patterns match secret-file.txt ---
PASS: aws-access-key pattern matched
PASS: browserstack-key pattern matched
PASS: password-assignment pattern matched
PASS: private-key-block pattern matched
PASS: secret-env-assignment pattern matched
PASS: api-key-assignment pattern matched
PASS: machine-secret-path pattern matched

--- Test: clean-file.md does NOT match any patterns ---
PASS: clean-file has no secret matches

--- Test: gate passes on clean repo (fixture excluded) ---
SECURITY GATE PASS: no credential patterns detected.
PASS: security-gate.sh exited 0 on clean repo

All tests passed.
```

### New gate output — `bash scripts/security-gate.sh`

```
SECURITY GATE PASS: no credential patterns detected.
```
