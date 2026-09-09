# Work harness optimization audit — 2026-09-08

This report captures a read-only audit of the local multi-harness work environment used around FrankenBrain Lite, Codex, OpenCode, Claude Code, ECC Memory Vault, continuous learning hooks, and Graphify.

The goal is portability: a future agent or operator should be able to pull this repository on another machine, understand what was found, and continue remediation without needing access to the original chat transcript.

## Scope

Audited from the local workstation `/home/uriel` on 2026-09-08.

Included:

- Codex local adapter and MCP startup state.
- OpenCode configuration, commands, plugins, and install paths.
- Claude Code hooks and permission rules.
- ECC continuous-learning observer state.
- ECC Memory Vault conventions and handoff path compatibility.
- Graphify git hooks and generated graph output behavior.
- Shell startup hygiene relevant to agent processes.
- Repo-local context from `~/vault`, especially multi-LLM bridge and Codex adoption notes.

Excluded:

- Destructive cleanup.
- Secret value disclosure.
- Direct mutation of Claude/OpenCode/Codex configuration.
- Rotation of external credentials.

## Canonical context from the vault

The vault defines the multi-agent contract and should remain the source of truth for runtime behavior:

- `~/vault/AGENTS.md` and `~/vault/CLAUDE.md` are intended to be identical.
- The active handoff path is `~/vault/memory/handoffs/CURRENT.md`.
- `memory/handoffs/` is plural because the ECC Memory Vault validates top-level directories as `${kind}s`.
- `~/vault/notes/setup-multi-llm-bridge.md` documents the bridge across Claude Code, OpenCode, and Codex.
- `~/vault/notes/adopcion-stack-nuevos-clis.md` documents how new CLIs should adopt the stack.
- `~/vault/decisions/2026-08-27-adopcion-stack-codex.md` records Codex adoption and the prior MCP `tools/list` compatibility fix.

Do not copy Claude/OpenCode runtime files into Codex just to change Codex behavior. Codex-local behavior belongs in `~/.codex/*`, while shared operational knowledge belongs in the vault or in a reviewed repository document like this one.

## Executive findings

### 1. ECC observer is retrying expensive analysis after repeated timeouts

Evidence from `/home/uriel/.local/share/ecc-homunculus/observer.log` showed repeated cycles like:

- analyzing roughly 5,500 observations;
- using the last 500 observations;
- timing out after 120 seconds;
- retaining observations for retry;
- repeating again after a short interval.

The PID file `/home/uriel/.local/share/ecc-homunculus/.observer.pid` pointed to PID `7712`, but no matching process was alive at audit time. That means there is stale process state plus repeated retry behavior in the observer loop.

Impact:

- Background CPU/process churn.
- Repeated LLM analysis attempts that are unlikely to succeed without changed conditions.
- Noise in the observer log.
- Risk that stale PID state hides whether the observer is actually running.

Recommended fix:

- Treat a PID file as valid only if `ps -p <pid>` confirms a live expected observer process.
- Remove stale PID files on startup.
- Add exponential backoff or a cooldown after repeated analysis timeouts.
- Compact or shard `observations.jsonl` so analysis does not keep retrying over the same oversized event set.
- Consider making the observer write a small status file with `last_success_at`, `last_failure_at`, `failure_count`, and `last_error`.

### 2. Claude permission rules use `Write(...)` where the runtime expects `Edit(...)`

The observer log reported that permission deny rules for `Write(~/.bashrc)` and `Write(~/.browserstack.env)` do not match file permission checks, and that `Edit(...)` rules are required.

Impact:

- The intended guard may not apply to actual file editing tools.
- The warning repeats in background analysis logs.
- Operators may believe a rule protects a file when the hook/runtime is ignoring it.

Recommended fix:

- In `~/.claude/settings.json`, change the affected deny rules from `Write(path)` to `Edit(path)`.
- Keep the rule scoped to the exact sensitive files.
- Verify by running the relevant Claude permission/debug path or a safe dry-run if available.

### 3. BrowserStack credentials are exported directly from `.bashrc`

The audit found BrowserStack environment variables exported directly in `/home/uriel/.bashrc`. The values are intentionally omitted from this report.

Impact:

- Any shell snapshot, agent transcript, crash dump, or process environment capture can persist those values.
- Multiple harnesses launch shell commands and may inherit the variables.
- A public repo like FrankenBrain Lite must never receive these values.

Recommended fix:

1. Rotate the BrowserStack access key.
2. Remove literal credential exports from `~/.bashrc`.
3. Keep only a source line such as:

   ```bash
   [ -f ~/.browserstack.env ] && source ~/.browserstack.env
   ```

4. Store the actual values in `~/.browserstack.env` with mode `600`.
5. After rotation, selectively purge or redact local shell snapshots/transcripts that captured the old values, especially under `~/.codex/shell_snapshots` and local Claude paste/session caches.

### 4. Shell PATH contains repeated entries

The effective shell PATH includes repeated entries, especially `~/.local/bin`, and Codex's injected path also appeared more than once during the audit.

Relevant local `.bashrc` area:

- `export PATH="$HOME/.local/bin:$PATH"`
- `export PATH=/home/uriel/.opencode/bin:$PATH`
- repeated installer-added `~/.local/bin` exports
- Maven path export

Impact:

- Slower command lookup in long-running shells.
- Harder debugging of which binary wins.
- Higher risk that install scripts keep appending duplicates.

Recommended fix:

Use an idempotent helper in `.bashrc`:

```bash
path_prepend_once() {
  case ":$PATH:" in
    *":$1:"*) ;;
    *) PATH="$1:$PATH" ;;
  esac
}

path_prepend_once "$HOME/.local/bin"
path_prepend_once "$HOME/.opencode/bin"
path_prepend_once "$M2_HOME/bin"
export PATH
```

Keep the exact final order intentional. Do not remove `~/.opencode/bin` while it remains the active `opencode` binary path.

### 5. Two OpenCode commands try a broken duplicated path before falling back

These command files contain a bad first command with a duplicated path segment, then a working fallback:

- `~/.config/opencode/command/projects.md`
- `~/.config/opencode/command/promote.md`

Bad shape observed:

```text
~/.config/opencode/skills/continuous-learning-v2/scripts/skills/continuous-learning-v2/scripts/instinct-cli.py
```

Working shape already present later in each file:

```text
~/.config/opencode/skills/continuous-learning-v2/scripts/instinct-cli.py
```

Impact:

- Each command starts with a guaranteed failure.
- Logs become noisier.
- Future operators may debug the fallback instead of fixing the primary command.

Recommended fix:

- Delete the duplicated-path command from both files.
- Leave the known-good command as the only command.
- Run both commands once after editing:

```bash
python3 ~/.config/opencode/skills/continuous-learning-v2/scripts/instinct-cli.py projects
python3 ~/.config/opencode/skills/continuous-learning-v2/scripts/instinct-cli.py promote --help
```

### 6. Codex-local AGENTS points to the old singular handoff path

The local Codex adapter `~/.codex/AGENTS.md` refers to:

```text
~/vault/memory/handoff/CURRENT.md
memory/handoff/CURRENT.md
```

The vault contract says the correct path is:

```text
~/vault/memory/handoffs/CURRENT.md
memory/handoffs/CURRENT.md
```

Impact:

- Codex can look for a stale/nonexistent file while the vault uses the corrected ECC schema path.
- This violates the compatibility boundary documented in the vault.

Recommended fix:

- Update only the Codex-local adapter file.
- Do not modify Claude or OpenCode configuration as a side effect.
- Verify with:

```bash
rg -n "memory/handoff" ~/.codex/AGENTS.md ~/vault/AGENTS.md ~/vault/CLAUDE.md
```

Expected result after remediation: no singular `memory/handoff` references in the Codex adapter, while the vault continues using plural `memory/handoffs`.

### 7. OpenCode install paths are split between legacy and XDG locations

Observed state:

- `command -v opencode` resolved to `/home/uriel/.opencode/bin/opencode`.
- `opencode debug paths` reported XDG-style directories under `.local/share`, `.cache`, `.config`, `.local/state`, and `/tmp/opencode`.
- Both `~/.opencode/node_modules` and `~/.config/opencode/node_modules` exist.

Impact:

- It is unclear which installation owns dependencies.
- Removing the wrong directory could break the active binary.
- PATH precedence may hide a newer binary in another location.

Recommended fix:

- Document the active binary path before cleanup.
- Do not delete `~/.opencode/bin` unless another verified binary is active.
- Compare package metadata in both `node_modules` trees before pruning.
- Prefer one installation strategy per machine.

### 8. Claude Stop hooks can add high latency

Claude Code has multiple Stop hooks, including a typecheck hook with a 300-second timeout plus quality/security-style checks.

Impact:

- Strong final quality gate, but expensive on every session stop.
- Slow exits can encourage operators to bypass the harness.

Recommended fix:

- Keep blocking behavior only for checks that must prevent completion.
- Make expensive checks project-aware or changed-file-aware.
- Move non-critical reporting to asynchronous hooks where safe.
- Keep handoff guard blocking only when context is high and the handoff is stale.

### 9. Graphify git hooks are well designed, but generated output can still create local noise

The graphify hooks found in `superapp-pty-engineering-lab` are backgrounded, have an opt-out environment variable, skip rebase/merge/cherry-pick states, and log to cache. That design is sound.

One repo still showed `graphify-out/` as untracked during the audit.

Impact:

- Persistent dirty worktree noise.
- Agents may accidentally include generated graph artifacts in unrelated commits.

Recommended fix:

- Add `graphify-out/` to `.gitignore` in repos where the graph is local cache.
- Keep repo-specific graph documentation separate from generated artifacts.
- After real code edits, run `graphify update .` only where graphify is intentionally enabled.

### 10. Codex MCP state is improved after the previous `tools/list` fix

Codex reported `ecc-memory-vault` enabled with:

```text
node /home/uriel/projects/ECC/scripts/memory-mcp.mjs
```

`codex doctor` outside the sandbox validated auth, local state databases, config loading, MCP config shape, and WebSocket reachability. The remaining doctor failure was an HTTP reachability check to the ChatGPT inference URL while WebSocket returned `101 Switching Protocols`.

Impact:

- The earlier MCP startup failure around `tools/list` accepting parameters appears addressed in the local Codex path.
- A separate network/provider HTTP reachability warning may still appear depending on network/sandbox conditions.

Recommended fix:

- Keep the MCP server tolerant of pagination/cursor fields in `tools/list`.
- Verify from Codex with `codex mcp list` and a fresh session restart.
- Track any remaining network failure separately from MCP correctness.

## Recommended remediation order

Use this order to minimize risk and avoid breaking other harnesses:

1. **Fix Codex-local stale handoff path**
   - File: `~/.codex/AGENTS.md`
   - Change only `memory/handoff` to `memory/handoffs`.

2. **Fix OpenCode command fallback noise**
   - Files: `~/.config/opencode/command/projects.md`, `~/.config/opencode/command/promote.md`
   - Remove the duplicated-path command lines.

3. **Fix Claude permission rules**
   - File: `~/.claude/settings.json`
   - Replace affected `Write(...)` permission entries with `Edit(...)`.

4. **Clean shell startup**
   - File: `~/.bashrc`
   - Deduplicate PATH setup.
   - Move BrowserStack credentials out of literal exports.
   - Rotate the BrowserStack key before purging snapshots.

5. **Harden ECC observer loop**
   - Add stale PID cleanup.
   - Add timeout backoff.
   - Add observation compaction/retention.
   - Verify observer behavior under repeated failure.

6. **Normalize Graphify artifacts**
   - Add `graphify-out/` to repo `.gitignore` where it is generated cache.

7. **Review OpenCode install duplication**
   - Confirm active binary.
   - Compare dependency trees.
   - Prune only with a verified rollback path.

## Fresh-machine continuation guide

After this PR is merged, continue from another machine with:

```bash
git clone https://github.com/urielreyna06/FrankenBrain-Lite.git
cd FrankenBrain-Lite
git pull origin master
sed -n '1,260p' docs/audits/2026-09-08-work-harness-optimization-audit.md
```

If the PR is not merged yet, fetch the branch directly:

```bash
git clone https://github.com/urielreyna06/FrankenBrain-Lite.git
cd FrankenBrain-Lite
git fetch origin docs/work-harness-optimization-audit
git checkout docs/work-harness-optimization-audit
sed -n '1,260p' docs/audits/2026-09-08-work-harness-optimization-audit.md
```

On the target machine, run these read-only checks before applying fixes:

```bash
codex doctor --summary
codex mcp list
opencode debug paths
opencode debug config
rg -n "memory/handoff" ~/.codex/AGENTS.md ~/vault/AGENTS.md ~/vault/CLAUDE.md
python3 ~/.config/opencode/skills/continuous-learning-v2/scripts/instinct-cli.py status
```

Do not paste credentials into the repo. If secrets appear in shell config or snapshots, rotate them first, then clean local files.

## Verification performed during audit

Commands and observations used for this report:

- `codex doctor --json` outside the sandbox.
- `codex mcp list`.
- `codex features list`.
- `codex plugin list`.
- `opencode debug paths`.
- `opencode debug config`.
- `git status --short --branch` in FrankenBrain Lite.
- Read-only inspection of `~/vault/AGENTS.md` and `~/vault/memory/handoffs/CURRENT.md`.
- Read-only inspection of `~/vault/notes/setup-multi-llm-bridge.md`.
- Read-only inspection of `~/vault/notes/adopcion-stack-nuevos-clis.md`.
- Read-only inspection of `~/vault/decisions/2026-08-27-adopcion-stack-codex.md`.
- Read-only inspection of shell startup and command files with credential values redacted.

## Non-goals for this PR

This PR intentionally does not change runtime configuration. It records the audit in a portable repository artifact so remediation can be reviewed and continued from any machine with GitHub access.
