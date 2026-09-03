<p align="center">
<pre>

:::   ::: ::::::::::     :::     :::::::::  :::       ::: ::::::::::
:+:   :+: :+:         :+: :+:   :+:    :+: :+:       :+: :+:
#:# #:#  #:#        #:#   #:#  #:#    #:# #:#       #:# #:#
#  #:#   #:#  #:#  #:#     #:# #:#    #:# #:#       #:# #:#
 #:#    #:#  #:# #:#       #:# #:#    #:# #:#       #:# #:#
 #:#   #:#   #:# #:#       #:# #:#    #:# #:#       #:# #:#
  #    ############:#        #  ############  ##########  ################

</pre>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/urielreyna06/FrankenBrain-Lite/actions"><img src="https://img.shields.io/github/actions/workflow/status/urielreyna06/FrankenBrain-Lite/validate.yml?branch=master" alt="CI"></a>
  <img src="https://img.shields.io/badge/harness-4%20harnesses-7c3aed" alt="4 harnesses">
  <img src="https://img.shields.io/badge/skills-21-green" alt="21 skills">
  <img src="https://img.shields.io/badge/agents-26-blue" alt="26 agents">
  <img src="https://img.shields.io/badge/security-hard-gated-red" alt="Security gated">
</p>

---

> You spent weeks teaching your AI how to work. **Don't rebuild it on the next
> machine. Install it.**

**FrankenBrain Lite** is the transplantable brain of a multi-harness AI assistant:
the [superpowers](https://github.com/obra/superpowers)-style skills, agents,
commands, and rules your agent learned — harvested, packaged, and stitched
together so any fresh environment can adopt the exact same working method with
**one clone**.

Four harnesses. One brain. Zero credentials.

```text
clone ──► register ──► harvest ──► secure
```

No re-installing. No drift. No teaching your assistant how to code all over again.

---

## Why "FrankenBrain"?

Because that's exactly what it is — a brain assembled from the best parts of a
long-lived assistant setup:

- **21 workflow skills** — the "how to work" muscle memory: TDD, debugging,
  security review, architecture, knowledge ops, cost-aware LLM routing,
  agent loops, evals, intent-driven development, and more.
- **26 specialized agents** — the "who does what" team: reviewers for Go,
  Rust, TypeScript, Python, Java, Kotlin, C++ and PHP; build-error resolvers;
  a security-reviewer; a silent-failure-hunter; a refactor-cleaner; a
  database-reviewer; and a loop-operator to keep autonomous agents from
  spinning forever.
- **24 commands** — the quick triggers: `plan`, `code-review`, `build-fix`,
  `save-session`, `resume-session`, `instinct-status` … instant vocabulary.
- **9 rules** — the standards that are always loaded: `common/` (testing,
  security, code-review, coding-style) plus a full `java/` stack
  (hooks, patterns, testing, security, coding-style).

Stitch those together and you don't have an assistant — you have a **system**.

## What's inside

| Component | Count | What it gives you |
|-----------|:-----:|-------------------|
| `skills/` | 21 | Procedural workflows — the muscle memory |
| `agents/` | 26 | Specialists for review, repair, security, architecture |
| `commands/` | 24 | Quick slash-style triggers |
| `rules/` | 9 | Always-loaded standards (`common/` + `java/`) |
| `scripts/` | 4 | harvest · security-gate · validate · install-hooks |
| CI | 1 | `validate.yml` — security + validate + shellcheck on every push |

### The skills, by family

| Family | The skills |
|--------|-----------|
| **Build right** | `systematic-debugging`, `ai-regression-testing`, `error-handling` |
| **Stay honest** | `verification-before-completion`, `delivery-gate`, `search-first` |
| **Think first** | `brainstorming`, `intent-driven-development`, `writing-plans`, `executing-plans` |
| **Stay safe** | `security-review`, `safety-guard`, `cloud-cli-operations` |
| **Remember** | `continuous-learning-v2`, `growth-log`, `knowledge-ops`, `unified-memory`, `context-budget` |
| **Run at scale** | `continuous-agent-loop`, `eval-harness`, `cost-aware-llm-pipeline` |
| **Curate** | `config-gc`, `rules-distill`, `skill-scout`, `agent-introspection-debugging` |

*(The exact family layout evolves as new skills are harvested — run
`make harvest` and the tree updates.)*

Note: the `using-dev` skill (preloaded each session) silently triages every
task against this whole library and routes you to the right tool — so you rarely
need to know these names. They're here so you *can*.

### Meet the agents

| Team | Members |
|------|---------|
| **Reviewers** | `code-reviewer`, `python-reviewer`, `go-reviewer`, `rust-reviewer`, `java-reviewer`, `kotlin-reviewer`, `cpp-reviewer`, `php-reviewer`, `database-reviewer`, `pr-test-analyzer` |
| **Build repair** | `build-error-resolver`, `go-build-resolver`, `rust-build-resolver`, `java-build-resolver`, `kotlin-build-resolver`, `cpp-build-resolver` |
| **Architecture & strategy** | `architect`, `agent-evaluator`, `harness-optimizer`, `loop-operator` |
| **Security & quality** | `security-reviewer`, `silent-failure-hunter`, `refactor-cleaner`, `doc-updater`, `docs-lookup`, `e2e-runner` |

Send a task to the right specialist — each starts with a fresh context and a
narrow mandate, so reviews are genuinely independent and fixes are minimal.

---

## Install

Pick your harness. One line gets you in; the collapsible blocks carry the
per-harness detail.

| Harness | One-line install |
|---------|------------------|
| **OpenCode** | Add `frankenbrain-lite@git+https://github.com/urielreyna06/FrankenBrain-Lite.git` to the `plugin` array in `~/.config/opencode/opencode.jsonc`, restart. |
| **Claude Code** | Add this repo as a plugin / marketplace source in `~/.claude/settings.json`. |
| **Gemini / Antigravity** | `gemini-extension.json` declares the plugin; `GEMINI.md` is the context file. |
| **Codex** | Clone the repo; point `AGENTS.md` and `rules/` from your Codex config. |

<details>
<summary><b>OpenCode — details</b></summary>

```jsonc
{
  "plugin": [
    "frankenbrain-lite@git+https://github.com/urielreyna06/FrankenBrain-Lite.git"
  ]
}
```

Already cloned it locally? Reference the path directly:

```jsonc
{
  "plugin": [
    "./path/to/FrankenBrain-Lite"
  ]
}
```

Then restart OpenCode.
</details>

<details>
<summary><b>Claude Code — details</b></summary>

Add this repo as a plugin source in `~/.claude/settings.json` (plugins /
marketplace mechanism) pointing at `https://github.com/urielreyna06/FrankenBrain-Lite`.
It contributes `skills/`, `agents/`, `commands/`, `rules/`.
</details>

<details>
<summary><b>Gemini / Antigravity — details</b></summary>

`gemini-extension.json` declares the plugin; `GEMINI.md` is the context file it loads.
</details>

<details>
<summary><b>Codex — details</b></summary>

Clone the repo; reference `AGENTS.md` and `rules/` from your Codex config.
</details>

---

## Start with the workflow you need

Don't learn the whole catalog. **Pick the job, get the tool.**

| What you're doing | Start here |
|-------------------|------------|
| Building a feature | `brainstorming` → `writing-plans` → `test-driven-development` |
| Hunting a bug | `systematic-debugging` (reproduce first, fix second) |
| Reviewing new code | `code-review` → the matching language reviewer agent |
| Failing build | the build-error-resolver for your stack |
| Shipping to prod | `security-review`, `verification-before-completion`, `e2e` |
| Ending a session | `save-session` / `checkpoint` |
| Resuming tomorrow | `resume-session` |
| Auditing your own agent config | `harness-audit` · `config-gc` · `context-budget` |
| Refreshing what's installed | `make harvest` |

---

## Security contract — the part that cannot bend

> [!WARNING]
> **This repo ships ZERO credentials — and it is public.** Never add or stage
> `.env`, `.aws/`, `.npmrc`, `.bashrc`, `.browserstack.env`, `*.key`, `*.pem`,
> or any private material. If you ever think a secret touched the repo: treat
> it as **exposed**, rotate it, and purge it from history — immediately.

Secrets are personal. **This brain has no secrets of its own.**

Per-machine credentials (BrowserStack, AWS SSO, a corporate CA) are configured
**on the machine, never in the repo**. Enforcement here is mechanical — it never
relies on remembering:

| Guard | What it does |
|-------|--------------|
| `.gitignore` | Lists forbidden paths first, so secrets can't even be staged |
| `scripts/security-gate.sh` | Scans the whole tree for 7 credential patterns |
| `make install-hooks` | Pre-commit hook runs the gate on **every** commit |
| `.github/workflows/validate.yml` | CI re-runs gate + validate + shellcheck; fails the build on any hit |

**Do this once per machine (never in the repo):**

1. Configure cloud CLIs (AWS SSO, gcloud) locally.
2. Create `~/.browserstack.env` (`chmod 600`) with your credentials.
3. Import your corporate CA into the system store and package managers.

---

## Development

```bash
make harvest        # refresh harvested ECC artifacts (dry-run; --apply to write)
make validate       # parse config + check SKILL.md frontmatter
make security       # scan for credentials (exit non-zero on any hit)
make check          # validate + security
make install-hooks  # install the pre-commit gate
```

Every commit runs the pre-commit gate; CI enforces the same checks on push.
The whole thing stays boring, predictable, and safe `by construction`.

---

## License

[MIT](LICENSE) © 2026 uriel

---

*Assembled from a [superpowers](https://github.com/obra/superpowers)-style
packaging workflow. Security-conscious by construction. Batteries included —
live wires excluded.*
