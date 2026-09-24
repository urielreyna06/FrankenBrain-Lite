# FrankenBrain Lite — Capability Catalog (Kiro, live workspace)

This steering file activates the FrankenBrain Lite brain when the Kiro workspace
root is the `skills/` folder. It is always included so Kiro knows which workflow
skills, specialist agents, and command intents exist, and how to route to them.

Source definitions live in the repository (one level up from this workspace):
- Skills: `skills/<name>/SKILL.md` (this workspace)
- Agents: `../agents/<name>.md`
- Commands: `../commands/<name>.md`
- Rules: `../rules/` (see `frankenbrain-rules.md`)

When a user request matches an entry below, open the corresponding source file and
follow its procedure. Prefer these established workflows over improvising.

## Skills (workflow procedures) — in this workspace

Open `<name>/SKILL.md` and follow it when the trigger matches.

**Build right:** `error-handling` · `ai-regression-testing` ·
`architecture-decision-records` · `delivery-gate` · `codebase-onboarding` ·
`agent-introspection-debugging`

**Stay honest:** `verification-before-completion` · `search-first` ·
`research-ops` · `token-budget-advisor`

**Think first:** `blueprint` · `intent-driven-development`

**Stay safe:** `security-review` · `safety-guard` · `cloud-cli-operations`

**Remember:** `continuous-learning-v2` · `growth-log` · `knowledge-ops` ·
`unified-memory` · `recursive-decision-ledger` · `graphify`

**Run at scale:** `continuous-agent-loop` · `eval-harness` ·
`cost-aware-llm-pipeline` · `context-budget` · `parallel-execution-optimizer` ·
`benchmark-optimization-loop`

**Curate:** `config-gc` · `rules-distill` · `skill-scout` ·
`agent-self-evaluation` · `using-dev`

## Agents (specialists) — in `../agents/<name>.md`

**Review:** `code-reviewer` · `python-reviewer` · `go-reviewer` · `rust-reviewer` ·
`java-reviewer` · `kotlin-reviewer` · `cpp-reviewer` · `php-reviewer` ·
`database-reviewer` · `pr-test-analyzer`

**Build repair:** `build-error-resolver` · `go-build-resolver` ·
`rust-build-resolver` · `java-build-resolver` · `kotlin-build-resolver` ·
`cpp-build-resolver`

**Strategy:** `architect` · `agent-evaluator` · `harness-optimizer` · `loop-operator`

**Quality & safety:** `security-reviewer` · `silent-failure-hunter` ·
`refactor-cleaner` · `doc-updater` · `docs-lookup` · `e2e-runner`

## Commands (intent triggers) — in `../commands/<name>.md`

`plan` · `code-review` · `build-fix` · `security` · `e2e` · `refactor-clean` ·
`update-docs` · `save-session` · `resume-session` · `checkpoint` · `learn` ·
`evolve` · `promote` · `prune` · `projects` · `harness-audit` · `cloud-check` ·
`aws` · `gcloud` · `loop-start` · `loop-status` · `instinct-export` ·
`instinct-import` · `instinct-status`

## Notes for Kiro

- Prefer Kiro-native hooks (`.kiro/hooks/`) for automation and Kiro specs for
  multi-step planned work.
- There is no slash-command runtime in Kiro; treat each command file as the
  procedure to execute directly.
