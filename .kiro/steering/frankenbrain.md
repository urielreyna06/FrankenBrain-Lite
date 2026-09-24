# FrankenBrain Lite — Capability Catalog (Kiro)

This steering file makes the FrankenBrain Lite brain available inside Kiro. It is
always included so Kiro knows which workflow skills, specialist agents, and
command intents exist, and how to route to them.

The full definitions live in the repository:
- Skills: `skills/<name>/SKILL.md`
- Agents: `agents/<name>.md`
- Commands: `commands/<name>.md`
- Rules: `rules/` (loaded via the companion steering file)

When a user request matches one of the entries below, open the corresponding
source file and follow its procedure. Prefer these established workflows over
improvising an approach.

## Skills (workflow procedures)

Open `skills/<name>/SKILL.md` and follow it when the trigger matches.

**Build right**
- `error-handling` — robust failure handling patterns
- `ai-regression-testing` — catch regressions in AI-driven behavior
- `architecture-decision-records` — capture ADRs for significant decisions
- `delivery-gate` — quality gate before shipping
- `codebase-onboarding` — get oriented in an unfamiliar codebase
- `agent-introspection-debugging` — debug agent behavior

**Stay honest**
- `verification-before-completion` — verify results before claiming done
- `search-first` — search before assuming
- `research-ops` — structured external research
- `token-budget-advisor` — advise on token spend

**Think first**
- `blueprint` — turn a one-line objective into a multi-step construction plan
- `intent-driven-development` — clarify intent before building

**Stay safe**
- `security-review` — review changes for security issues
- `safety-guard` — guardrails for risky/destructive actions
- `cloud-cli-operations` — safe cloud CLI operations

**Remember**
- `continuous-learning-v2` — learn from sessions over time
- `growth-log` — log growth/learnings
- `knowledge-ops` — manage a knowledge base
- `unified-memory` — unified memory model
- `recursive-decision-ledger` — track decisions recursively
- `graphify` — build/maintain a knowledge graph

**Run at scale**
- `continuous-agent-loop` — long-running autonomous loop
- `eval-harness` — evaluate agent outputs
- `cost-aware-llm-pipeline` — cost-aware LLM pipelines
- `context-budget` — manage context window budget
- `parallel-execution-optimizer` — parallelize independent work
- `benchmark-optimization-loop` — optimize against benchmarks

**Curate**
- `config-gc` — garbage-collect stale config
- `rules-distill` — distill rules from usage
- `skill-scout` — discover/curate new skills
- `agent-self-evaluation` — agents evaluate their own output
- `using-dev` — dev usage helper

## Agents (specialists)

Invoke as sub-agents when the task matches. Definitions in `agents/<name>.md`.

**Review** — `code-reviewer`, `python-reviewer`, `go-reviewer`, `rust-reviewer`,
`java-reviewer`, `kotlin-reviewer`, `cpp-reviewer`, `php-reviewer`,
`database-reviewer`, `pr-test-analyzer`

**Build repair** — `build-error-resolver`, `go-build-resolver`,
`rust-build-resolver`, `java-build-resolver`, `kotlin-build-resolver`,
`cpp-build-resolver`

**Strategy** — `architect`, `agent-evaluator`, `harness-optimizer`, `loop-operator`

**Quality & safety** — `security-reviewer`, `silent-failure-hunter`,
`refactor-cleaner`, `doc-updater`, `docs-lookup`, `e2e-runner`

## Commands (intent triggers)

When the user asks for one of these, follow `commands/<name>.md`.

`plan`, `code-review`, `build-fix`, `security`, `e2e`, `refactor-clean`,
`update-docs`, `save-session`, `resume-session`, `checkpoint`, `learn`,
`evolve`, `promote`, `prune`, `projects`, `harness-audit`, `cloud-check`,
`aws`, `gcloud`, `loop-start`, `loop-status`, `instinct-export`,
`instinct-import`, `instinct-status`

## Notes for Kiro

- Kiro-native equivalents: use Kiro hooks (`.kiro/hooks/`) where a command
  describes automation, and Kiro specs for multi-step planned work.
- Commands here are documented as intents; there is no slash-command runtime in
  Kiro, so treat the command file as the procedure to execute directly.
