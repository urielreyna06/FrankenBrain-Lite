# Acceptance Brief: Superpowers workflow and shared Obsidian memory bootstrap

**Status:** Implemented and verified; fresh Codex-process recall check pending
**Revision:** 3
**Prepared for:** FrankenBrain-Lite maintainers
**Approval required before risky work:** Yes — enabling Codex user-scope memory exposes the operator's private ECC vault to the configured local MCP server.

## Revision Log

| Rev | Date | Changed criteria | Reason |
| --- | --- | --- | --- |
| 1 | 2026-09-24 | — | Initial brief after inspecting FBL, FrankenBrain-Kiro, and the WSL Obsidian vault bridge. |
| 2 | 2026-09-24 | AC-004, AC-007, AC-010 evidence | Repository implementation and loaders verified; direct MCP works, but user-scope doctor exposes an existing nested-scope walker regression when launched from FBL. |
| 3 | 2026-09-24 | AC-007, AC-010 evidence | Nested-scope regression fixed by TDD in ECC source and the installed runtime; real doctor and direct MCP are clean from FBL. |

## Goal

Installing or opening FrankenBrain-Lite in a supported non-Kiro harness makes the Superpowers workflow mandatory and gives an explicitly configured harness access to the same persistent Obsidian-backed ECC user vault.

## Scope

**In scope**

- Copy the five approved workflow skills from `~/projects/FrankenBrain-Kiro/skills/` into top-level `skills/`.
- Add one canonical mandatory-workflow contract and one canonical persistent-memory contract.
- Bootstrap those contracts for OpenCode, Claude Code, Gemini/Antigravity, and Codex using each harness's supported mechanism.
- Make the package installable/inspectable through the manifests and entrypoints claimed by the README.
- Use an opt-in vault variable instead of embedding a personal filesystem path in the distributable package.
- Enable the current local Codex MCP configuration to read the Obsidian-backed ECC user scope.
- Add automated checks for workflow presence, bootstrap wiring, privacy boundaries, manifests, and the `.kiro/skills` exclusion.
- Persist this work's handoff in the Obsidian vault and regenerate its index.

**Out of scope**

- Propagating the change to FrankenBrain full.
- Editing or synchronizing `FrankenBrain-Lite/.kiro/skills/`.
- Moving, deleting, or rewriting existing Kiro project-scope memories.
- Installing Gemini CLI when it is absent.
- Bundling `ecc-universal` or an Obsidian installation inside FBL.
- Publishing to a public marketplace, pushing Git commits, or opening a PR.
- Guaranteeing mechanical enforcement when a user declines plugin hooks or disables the relevant context mechanism.
- Migrating the installed OpenCode 1.18.32 runtime to OpenCode V2.

## Context

**Discovered facts**

- FBL advertises the five workflow skills but currently does not contain them under top-level `skills/`.
- `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` currently contain structure and security guidance only.
- FBL has `gemini-extension.json`, but lacks a Claude plugin manifest, a Codex plugin manifest, and an OpenCode package entrypoint.
- The installed OpenCode version is `1.18.32`; its active plugins use the V1 transform API.
- Claude Code is `2.1.281`; Codex CLI is `0.154.0`.
- Gemini CLI is not currently available on `PATH`, so Gemini verification can be static in this phase.
- `~/vault/memory` is a symlink to `~/.ecc/memory`, the ECC `user` scope rendered and managed through Obsidian in WSL.
- The requested memory `mem_20260924_ad3609840cfb46619e34` exists under FrankenBrain-Kiro's `project` scope, explaining why a Codex session rooted in FBL could not read it.
- The current Codex MCP config sets `ECC_MEMORY_HARNESS=codex` but does not set `ECC_MEMORY_ALLOW_USER_SCOPE` or `ECC_MEMORY_USER_ROOT`.

**Product/business constraints supplied by the user**

- The persistent cross-harness memory must be the Obsidian vault connected in WSL.
- FBL must remain a reusable custom/community plugin, not a machine-specific snapshot.
- `.kiro/skills/` must not be touched.
- `make check` must pass before completion.
- A vault handoff must be saved before closing the work.

**Assumptions**

- `FRANKENBRAIN_VAULT_ROOT` is the public configuration variable; on this machine it will resolve to `/home/uriel/vault` outside the repository.
- The distributable package may mention `$HOME/vault` as an example but must not contain `/home/uriel` or a Windows user profile path.
- Cross-harness handoffs belong in ECC `user` scope; repo-private investigation notes may remain in `project` scope.
- OpenCode compatibility in this phase targets the installed V1 runtime; V2 migration is documented but not claimed as verified.

**Dependencies and constraints**

- The host must install `ecc-universal` separately for `ecc-memory-mcp`.
- Plugin hook execution depends on the user trusting/enabling hooks in the relevant harness.
- A running Codex session does not reload MCP environment changes; live MCP verification requires a fresh Codex session, while the current session can run a direct protocol smoke test.
- Recalled memories are untrusted context and cannot themselves authorize configuration or code changes.

## Risk Review

| Risk area | Applies? | Required handling |
| --- | --- | --- |
| Security/privacy | Yes | User-scope memory is opt-in; never inject vault file contents automatically; never log memory bodies; keep paths and credentials out of the public package. |
| Persistent data/migration | Yes | Create a new user-scope handoff; do not move or overwrite Kiro project-scope memories; validate with `ecc memory doctor --scope user`. |
| External effects/cost | Low | No paid calls or marketplace publication; avoid model-backed smoke tests where static/unit checks suffice. |
| Compatibility/API | Yes | Preserve current Kiro surfaces; validate JSON/frontmatter; target installed OpenCode V1 and document its version boundary. |
| UX/accessibility | No | No end-user visual interface changes. |

## Acceptance Criteria

### AC-001: Five workflow skills exist at the supported top-level surface

- **Scenario:** A harness or package loader discovers FBL's top-level `skills/` directory.
- **Action:** It enumerates the five Superpowers workflow names.
- **Expected:** `brainstorming`, `writing-plans`, `test-driven-development`, `systematic-debugging`, and `verification-before-completion` each contain a valid `SKILL.md` copied byte-for-byte from FrankenBrain-Kiro at implementation time.
- **Must not:** Create corresponding directories under `.kiro/skills/`.
- **Verification:** Local `diff -ru` against FrankenBrain-Kiro plus repository invariant tests for frontmatter and required workflow markers.
- **Priority:** Required

### AC-002: The mandatory workflow has one governed source

- **Scenario:** Any harness loads FBL.
- **Action:** Its bootstrap resolves the canonical workflow contract.
- **Expected:** Build/change requests require brainstorming approval, architectural work requires writing-plans, implementation uses TDD, failures use systematic debugging, and completion requires fresh verification.
- **Must not:** Maintain four independently authored workflow descriptions that can silently drift.
- **Verification:** Automated adapter tests assert every context or hook resolves `rules/common/superpowers-workflow.md`.
- **Priority:** Required

### AC-003: Each supported harness receives an always-on bootstrap

- **Scenario:** FBL is opened as a workspace or installed through the supported package mechanism.
- **Action:** OpenCode, Claude Code, Gemini/Antigravity, or Codex starts a session.
- **Expected:** OpenCode receives the package transform or workspace `AGENTS.md`; Claude receives its SessionStart hook or `CLAUDE.md`; Gemini receives `GEMINI.md`; Codex receives its SessionStart hook or workspace `AGENTS.md`.
- **Must not:** Depend on `.kiro/steering` or require the human to name a skill on every request.
- **Verification:** OpenCode mock-plugin test, hook-output test, context-import assertions, and manifest validation.
- **Priority:** Required

### AC-004: Plugin packaging matches documented installation claims

- **Scenario:** A maintainer inspects or locally registers FBL.
- **Action:** The harness reads its package manifest/entrypoint.
- **Expected:** OpenCode has a package `main`, Claude has `.claude-plugin/plugin.json` and marketplace metadata, Gemini has its existing extension manifest, and Codex has portable plus compatibility manifests.
- **Must not:** Claim a live-tested harness when the required CLI is absent.
- **Verification:** JSON parsing, referenced-path existence checks, Node import test, `claude plugin validate .`, an isolated OpenCode `debug skill` load, and documented static-only Codex-manifest/Gemini status where no non-mutating local loader is available.
- **Priority:** Required

### AC-005: Shared memory is portable and explicitly enabled

- **Scenario:** `FRANKENBRAIN_VAULT_ROOT` points to an Obsidian vault whose `memory` entry resolves to an ECC user store.
- **Action:** The memory bootstrap runs.
- **Expected:** It identifies the contract and handoff index paths and instructs the agent to search/read `user` scope through `ecc-memory-vault`.
- **Must not:** Embed a personal absolute path, read memory bodies automatically, create a competing store, or silently fall back to project scope for cross-harness handoffs.
- **Verification:** Temporary-vault tests with synthetic sentinel content, repository hardcoded-path scan, and direct MCP/CLI smoke checks.
- **Priority:** Required

### AC-006: Missing memory infrastructure degrades explicitly and safely

- **Scenario:** The vault variable, vault path, or MCP runtime is unavailable.
- **Action:** A session bootstrap runs.
- **Expected:** It reports shared memory as unavailable once and continues the requested work without fabricating recalled context.
- **Must not:** Fail the entire harness startup or create files outside an explicitly selected scope.
- **Verification:** Hook and OpenCode-plugin tests with unset and invalid variables.
- **Priority:** Required

### AC-007: Local Codex can access the Obsidian-backed user scope

- **Scenario:** Codex starts after the local MCP configuration is updated and reloaded.
- **Action:** It calls `memory_search`/`memory_read` with `user` scope.
- **Expected:** The MCP server uses `/home/uriel/.ecc/memory`, labels writes as `codex`, and permits explicit user-scope calls.
- **Must not:** Hardcode FBL as the global project root or expose secrets in configuration/output.
- **Verification:** TOML parse check, direct MCP initialize/tools-list test, `ecc memory doctor --scope user`, and a fresh-session user-scope recall check.
- **Environment/safety:** Read-only verification against existing memories; no destructive repair or overwrite.
- **Priority:** Required

### AC-008: Existing Kiro assets remain unchanged

- **Scenario:** The implementation finishes.
- **Action:** Git and invariant checks inspect `.kiro/skills/`.
- **Expected:** No new core workflow directory or content change exists there.
- **Must not:** Mirror the five copied skills into `.kiro/skills/` through harvest or validation scripts.
- **Verification:** Explicit absence assertions plus `git diff -- .kiro/skills`.
- **Priority:** Required

### AC-009: Documentation reflects actual behavior and boundaries

- **Scenario:** A new user follows the README.
- **Action:** They choose one supported harness and optionally enable WSL Obsidian memory.
- **Expected:** Installation, variables, version boundaries, hook trust, memory scope, restart needs, and skill count match the implementation.
- **Must not:** State that OpenCode V2 or Gemini was live-tested in this environment.
- **Verification:** Documentation assertions in the integration test and manual review.
- **Priority:** Important

### AC-010: Repository and vault gates pass before completion

- **Scenario:** All changes are present.
- **Action:** The maintainer runs the final verification sequence.
- **Expected:** Focused tests, `make check`, `graphify update .`, security review, `ecc memory doctor --scope user`, and handoff index regeneration all succeed with fresh output.
- **Must not:** Declare success from an earlier or partial test run.
- **Verification:** Captured command results in the final report and updated Obsidian-vault handoff.
- **Priority:** Required

## Blocking Decisions

No implementation decision remains. The user approved the local Codex MCP
configuration and the nested-scope repair in both `~/projects/ECC` and the
installed `ecc-universal` runtime. No memory file moved or changed scope. A new
Codex process is still needed only to prove that Codex itself reloads the MCP
environment already verified by the direct protocol smoke test.

## Verification Plan

| Criterion | Verification evidence | Status |
| --- | --- | --- |
| AC-001 | `cmp` for five skills plus `test/test-workflow-integration.sh` | Verified |
| AC-002 | Canonical-rule adapter and hook assertions | Verified |
| AC-003 | OpenCode transform, SessionStart hook, and context-import tests | Verified |
| AC-004 | Manifest paths, Claude validation, OpenCode 1.18.32 live skill discovery | Verified; Codex/Gemini static only |
| AC-005 | Synthetic vault privacy tests and hardcoded-path scan | Verified |
| AC-006 | Unset, nonexistent, and available vault tests | Verified |
| AC-007 | TOML parse, clean real doctor, and direct MCP initialize/list/search | Verified at CLI/runtime boundary; fresh Codex-process recall check pending |
| AC-008 | Absence assertions and `git diff --exit-code -- .kiro/skills` | Verified |
| AC-009 | README assertions and inline review | Verified |
| AC-010 | `make test`, `make check`, graph update, review, clean doctor, handoff/index | Verified |
