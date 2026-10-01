# FrankenBrain-Lite Global Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make FrankenBrain-Lite the single source of skills, agents, commands, workflow bootstrap and continuous learning for Claude Code, OpenCode and Codex, active in every session from any directory.

**Architecture:** The repo holds harness-neutral content (skills, agents, commands, rules). Small per-harness adapters (Claude plugin hook, Codex plugin hook, OpenCode plugin) inject a bootstrap built by one shared Node library, register what each harness can load natively, and an installer generates what a harness cannot load from a plugin (Claude's 12 agents, Codex agent TOML). Loose copies in harness directories move to `_disabled/<date>/` and are restorable.

**Tech Stack:** Node.js ≥ 22 (ESM, `node:test`-free plain asserts like existing tests), Bash, Python 3 (existing observer scripts), Claude Code 2.1.x plugins, OpenCode 1.18.32 V1 plugin API, Codex CLI 0.154.0 plugins.

**Spec:** `docs/superpowers/specs/2026-09-25-frankenbrain-global-plugin-design.md` (read it first; this plan argues from it).

## Global Constraints

- Distributable files must not contain `/home/uriel` or a Windows user-profile path (enforced by `test/test-workflow-integration.sh`).
- `make check` must pass at the end of every task that touches the repo.
- Nothing may block a harness session: every adapter catches its own errors and degrades to a one-line notice.
- Every change outside the repo is reversible: loose files move to `_disabled/<YYYY-MM-DD>/` under the same harness root; state is recorded in `~/.local/share/frankenbrain/install-state.json`.
- Agents per harness: Claude 12 (listed in `harness/claude-agents.txt`), OpenCode 27, Codex 27.
- Skills: the plugin ships 32 skills (38 today − 5 workflow skills − `using-dev`); no per-harness skill exclusions.
- Observer models: Claude `haiku`, Codex `gpt-5.6-luna`, OpenCode `session` (active model; no background process).
- Bootstrap text ≤ 6,000 characters.
- Files stay under 400 lines; functions under 50 lines.
- Commit messages use conventional prefixes and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Do not touch `.kiro/` (Kiro project rule).

## Spec addenda decided while planning

1. **Content reconciliation comes first** (user decision "la más completa gana"): live agents/skills/commands differ from the repo (e.g. Claude `code-reviewer` 246 lines vs repo 89). Tasks 2–3 merge them with a user checkpoint.
2. **Instinct injection:** the FBL bootstrap injects instincts only for Codex. Claude keeps ECC's SessionStart injection with `ECC_MAX_INJECTED_INSTINCTS=12` (fixes H3 truncation); OpenCode keeps `ecc-learning.ts`. This avoids double injection.
3. **`fbl` helper on PATH:** commands call `fbl instinct …` / `fbl rules-scan …` instead of absolute skill paths that disappear when loose copies move.
4. **Global learned skills are written to the repo** (`learn-eval` → `$(fbl root)/skills/<name>/`), then `make update` — improvements land in the single source.

## File Structure

| Path | Responsibility |
|---|---|
| `lib/frontmatter.mjs` | Parse the simple YAML frontmatter used by agents, commands, skills, instincts |
| `lib/agents.mjs` | Load canonical agents; convert to Claude Markdown, Codex TOML, OpenCode config |
| `lib/commands.mjs` | Load commands; convert to OpenCode config |
| `lib/instincts.mjs` | Load instincts, deduplicate, select within a character budget |
| `lib/bootstrap.mjs` | Detect harness, resolve vault status, build the bootstrap text |
| `harness/facts.json` | Per-harness facts injected into the bootstrap |
| `harness/claude-agents.txt` | The 12 agents installed for Claude |
| `harness/codex-agent-overrides.json` | Per-agent Codex model/sandbox overrides |
| `harness/retired.txt` | Names removed from the repo on purpose (not "absorb" candidates) |
| `harness/reconcile-accepted.txt` | Live-only lines deliberately not merged (harness paths) |
| `rules/common/frankenbrain-workflow.md` | 8-step workflow + routing (replaces `superpowers-workflow.md`) |
| `hooks/session-start.mjs` | Claude/Codex SessionStart entry point |
| `hooks/codex-hooks.json` | Codex hook registration (SessionStart + observation capture) |
| `hooks/hooks.json` | Claude hook registration (SessionStart + observation capture) |
| `.agents/plugins/marketplace.json` | Codex local marketplace catalog |
| `.opencode/plugins/frankenbrain.js` | OpenCode adapter: skills path, agents, commands, bootstrap |
| `bin/fbl` | Stable helper entry point on PATH |
| `skills/continuous-learning-v2/agents/analyzer-command.sh` | Observer analyzer argv per backend |
| `scripts/reconcile-report.mjs` | Diff repo vs live harness copies |
| `scripts/fbl-install.mjs` | Installer CLI: install / update / uninstall / verify |
| `scripts/install/common.mjs` | State file, move-to-disabled, restore, managed writes, CLI runner |
| `scripts/install/claude.mjs` | Claude install/uninstall steps |
| `scripts/install/opencode.mjs` | OpenCode install/uninstall steps |
| `scripts/install/codex.mjs` | Codex install/uninstall steps |
| `scripts/install/verify.mjs` | Post-install verification |
| `test/*.mjs`, `test/*.sh` | Tests listed per task |

---

## Phase 1 — Content reconciliation

### Task 1: Frontmatter parser and reconciliation report

**Files:**
- Create: `lib/frontmatter.mjs`
- Create: `scripts/reconcile-report.mjs`
- Create: `harness/retired.txt`
- Create: `harness/reconcile-accepted.txt`
- Test: `test/test-frontmatter.mjs`, `test/test-reconcile.mjs`

**Interfaces:**
- Produces: `parseFrontmatter(text) -> { data: object, body: string }` (throws on unsupported lines); `buildReport({ root, home }) -> Array<{category, harness, name, status: "ok"|"merge"|"absorb", missing: number, lines: string[]}>`; CLI `node scripts/reconcile-report.mjs [--check] [--category agents|skills|commands] [--snapshot DIR]`.

- [ ] **Step 1: Write the failing frontmatter test**

```js
// test/test-frontmatter.mjs
import assert from "node:assert/strict"
import { parseFrontmatter } from "../lib/frontmatter.mjs"

const parsed = parseFrontmatter([
  "---",
  "description: Reviews code: fast and safe",
  "mode: subagent",
  "confidence: 0.85",
  "tools:",
  "  read: true",
  "  write: false",
  "---",
  "",
  "Body line",
].join("\n"))
assert.equal(parsed.data.description, "Reviews code: fast and safe")
assert.equal(parsed.data.mode, "subagent")
assert.equal(parsed.data.confidence, 0.85)
assert.deepEqual(parsed.data.tools, { read: true, write: false })
assert.equal(parsed.body.trim(), "Body line")

const noFrontmatter = parseFrontmatter("just text")
assert.deepEqual(noFrontmatter.data, {})
assert.equal(noFrontmatter.body, "just text")

const quoted = parseFrontmatter("---\nname: 'x'\ndescription: \"y\"\n---\nz")
assert.equal(quoted.data.name, "x")
assert.equal(quoted.data.description, "y")

assert.throws(() => parseFrontmatter("---\n- list item\n---\nbody"), /unsupported frontmatter line/)
console.log("FRONTMATTER TEST PASS")
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node test/test-frontmatter.mjs`
Expected: FAIL with `Cannot find module '.../lib/frontmatter.mjs'`.

- [ ] **Step 3: Implement the parser**

```js
// lib/frontmatter.mjs
// Minimal parser for the flat frontmatter used across FrankenBrain-Lite
// (scalars plus one level of nested maps such as `tools:`).
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

function coerce(raw) {
  const value = raw.trim()
  if (value === "true") return true
  if (value === "false") return false
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value)
  return value.replace(/^(['"])(.*)\1$/, "$2")
}

export function parseFrontmatter(text) {
  const match = FRONTMATTER.exec(text)
  if (!match) return { data: {}, body: text }
  const data = {}
  let currentKey = null
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue
    const nested = /^\s{2,}([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (nested && currentKey && typeof data[currentKey] === "object") {
      data[currentKey][nested[1]] = coerce(nested[2])
      continue
    }
    const top = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!top) throw new Error(`unsupported frontmatter line: ${line}`)
    currentKey = top[1]
    data[currentKey] = top[2].trim() === "" ? {} : coerce(top[2])
  }
  return { data, body: match[2] }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node test/test-frontmatter.mjs`
Expected: `FRONTMATTER TEST PASS`

- [ ] **Step 5: Write the failing reconcile test**

```js
// test/test-reconcile.mjs
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildReport } from "../scripts/reconcile-report.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const home = fs.mkdtempSync(path.join(os.tmpdir(), "fbl-reconcile-"))
try {
  const agentsDir = path.join(home, ".claude", "agents")
  fs.mkdirSync(agentsDir, { recursive: true })
  const canonical = fs.readFileSync(path.join(root, "agents", "architect.md"), "utf8")
  fs.writeFileSync(path.join(agentsDir, "architect.md"), `${canonical}\nUNIQUE-LIVE-LINE-123\n`)
  fs.writeFileSync(path.join(agentsDir, "zz-live-only.md"), "---\ndescription: x\n---\nonly here\n")

  const rows = buildReport({ root, home })
  const architect = rows.find((r) => r.category === "agents" && r.name === "architect")
  assert.equal(architect.status, "merge")
  assert.deepEqual(architect.lines, ["UNIQUE-LIVE-LINE-123"])
  const liveOnly = rows.find((r) => r.name === "zz-live-only")
  assert.equal(liveOnly.status, "absorb")
} finally {
  fs.rmSync(home, { recursive: true, force: true })
}
console.log("RECONCILE TEST PASS")
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `node test/test-reconcile.mjs`
Expected: FAIL, module `scripts/reconcile-report.mjs` not found.

- [ ] **Step 7: Create the name lists**

`harness/retired.txt`:
```
# Names removed from the repository on purpose. Live copies of these are not "absorb" candidates.
brainstorming
writing-plans
test-driven-development
systematic-debugging
verification-before-completion
using-dev
```

`harness/reconcile-accepted.txt`:
```
# Exact trimmed lines that exist only in live harness copies and are deliberately NOT merged
# (harness-specific paths replaced by neutral wording). One line per entry.
```

- [ ] **Step 8: Implement the report**

```js
// scripts/reconcile-report.mjs
// Compares canonical agents/skills/commands with live harness copies (body lines only).
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { parseFrontmatter } from "../lib/frontmatter.mjs"

const SOURCES = {
  agents: [["claude", ".claude/agents", "file"], ["opencode", ".config/opencode/agent", "file"]],
  commands: [["claude", ".claude/commands", "file"], ["opencode", ".config/opencode/command", "file"]],
  skills: [["claude", ".claude/skills", "dir"], ["opencode", ".config/opencode/skills", "dir"], ["agents", ".agents/skills", "dir"]],
}
const SYSTEM_SKILLS = new Set(["learned", "synced"])

function readList(root, file) {
  const full = path.join(root, "harness", file)
  if (!fs.existsSync(full)) return new Set()
  return new Set(fs.readFileSync(full, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")))
}

function listItems(base, kind) {
  const items = new Map()
  if (!fs.existsSync(base)) return items
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (kind === "file" && entry.isFile() && entry.name.endsWith(".md")) {
      items.set(entry.name.slice(0, -3), path.join(base, entry.name))
    }
    const skillFile = path.join(base, entry.name, "SKILL.md")
    if (kind === "dir" && entry.isDirectory() && !entry.name.startsWith(".") && !SYSTEM_SKILLS.has(entry.name) && fs.existsSync(skillFile)) {
      items.set(entry.name, skillFile)
    }
  }
  return items
}

function bodyLines(file) {
  const { body } = parseFrontmatter(fs.readFileSync(file, "utf8"))
  return body.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
}

function canonicalPath(root, category, name) {
  return category === "skills" ? path.join(root, "skills", name, "SKILL.md") : path.join(root, category, `${name}.md`)
}

export function buildReport({ root, home }) {
  const accepted = readList(root, "reconcile-accepted.txt")
  const retired = readList(root, "retired.txt")
  const rows = []
  for (const [category, sources] of Object.entries(SOURCES)) {
    for (const [harness, rel, kind] of sources) {
      for (const [name, file] of listItems(path.join(home, rel), kind)) {
        if (retired.has(name)) continue
        const canonical = canonicalPath(root, category, name)
        if (!fs.existsSync(canonical)) {
          rows.push({ category, harness, name, status: "absorb", missing: bodyLines(file).length, lines: [] })
          continue
        }
        const have = new Set(bodyLines(canonical))
        const lines = [...new Set(bodyLines(file))].filter((l) => !have.has(l) && !accepted.has(l))
        rows.push({ category, harness, name, status: lines.length ? "merge" : "ok", missing: lines.length, lines })
      }
    }
  }
  return rows
}

function snapshot(rows, home, dest) {
  for (const row of rows) {
    const rel = SOURCES[row.category].find(([h]) => h === row.harness)[1]
    const src = row.category === "skills" ? path.join(home, rel, row.name) : path.join(home, rel, `${row.name}.md`)
    fs.cpSync(src, path.join(dest, row.harness, row.category, path.basename(src)), { recursive: true })
  }
}

function main(argv) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  const home = process.env.FBL_HOME ?? os.homedir()
  const category = argv.includes("--category") ? argv[argv.indexOf("--category") + 1] : null
  const rows = buildReport({ root, home }).filter((r) => !category || r.category === category)
  if (argv.includes("--snapshot")) snapshot(rows, home, argv[argv.indexOf("--snapshot") + 1])
  for (const r of rows.filter((x) => x.status !== "ok")) {
    console.log(`${r.status.toUpperCase()} ${r.category}/${r.name} (${r.harness}): ${r.missing} line(s)`)
    for (const line of r.lines.slice(0, 20)) console.log(`    + ${line}`)
  }
  const pending = rows.filter((r) => r.status !== "ok").length
  console.log(`RECONCILE: ${rows.length} compared, ${pending} pending`)
  if (argv.includes("--check") && pending > 0) process.exit(1)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2))
```

- [ ] **Step 9: Run both tests and confirm they pass**

Run: `node test/test-frontmatter.mjs && node test/test-reconcile.mjs`
Expected: `FRONTMATTER TEST PASS` then `RECONCILE TEST PASS`.

- [ ] **Step 10: Register tests in the Makefile `test` target**

Add under `test:` in `Makefile`:
```make
	node test/test-frontmatter.mjs
	node test/test-reconcile.mjs
```

- [ ] **Step 11: Snapshot live copies and record the baseline report**

Run:
```bash
SNAP="$HOME/.local/share/frankenbrain/reconcile/$(date +%F)"
mkdir -p "$SNAP"
node scripts/reconcile-report.mjs --snapshot "$SNAP" > "$SNAP/report-before.txt"; tail -1 "$SNAP/report-before.txt"
```
Expected: a `RECONCILE: N compared, M pending` line with M > 0; the snapshot directory contains `claude/`, `opencode/`, `agents/` subtrees.

- [ ] **Step 12: Run `make check` and commit**

```bash
make check
git add lib/frontmatter.mjs scripts/reconcile-report.mjs harness/retired.txt harness/reconcile-accepted.txt test/test-frontmatter.mjs test/test-reconcile.mjs Makefile
git commit -m "feat(reconcile): frontmatter parser and repo-vs-live reconciliation report

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Reconcile agents (user checkpoint)

**Files:**
- Modify: `agents/*.md` (every agent reported `MERGE`)
- Create: `agents/self-healer.md` (absorbed from OpenCode)
- Modify: `harness/reconcile-accepted.txt`

**Interfaces:**
- Consumes: `node scripts/reconcile-report.mjs --category agents` (Task 1).
- Produces: canonical agents with frontmatter keys `description`, `mode`, `tools` (nested map of `read|write|edit|bash|webfetch|websearch: true|false`) and optional `model`.

Merge rule ("la más completa gana"): for each agent, the base is the version with more unique body lines; append every section that exists only in the other version (e.g. `## Prompt Defense Baseline`); keep the longer, more specific `description`; keep canonical frontmatter keys only. Harness-specific path lines are rewritten neutrally and the original live line is added to `harness/reconcile-accepted.txt`.

- [ ] **Step 1: List pending agents**

Run: `node scripts/reconcile-report.mjs --category agents`
Expected (baseline 2026-09-25): `MERGE` for `architect`, `code-reviewer`, `doc-updater`, `docs-lookup`, `harness-optimizer`, `java-build-resolver`, `java-reviewer`, `security-reviewer` (claude) and OpenCode rows; `ABSORB agents/self-healer (opencode)`.

- [ ] **Step 2: Merge each MERGE agent**

For each agent `A` listed: open `agents/A.md`, `~/.claude/agents/A.md`, `~/.config/opencode/agent/A.md`; apply the merge rule above; write the result to `agents/A.md`. Claude frontmatter `tools: Read, Grep, Glob, Bash` maps to canonical `tools:` map as `Read|Grep|Glob → read: true`, `Bash → bash: true`, `Write → write: true`, `Edit → edit: true`, `WebFetch → webfetch: true`, `WebSearch → websearch: true`.

- [ ] **Step 3: Absorb `self-healer`**

Copy `~/.config/opencode/agent/self-healer.md` to `agents/self-healer.md`, keeping `description`, `mode`, `tools`, `model`.

- [ ] **Step 4: Verify nothing is left**

Run: `node scripts/reconcile-report.mjs --category agents --check; echo exit=$?`
Expected: `RECONCILE: … 0 pending` and `exit=0`.

- [ ] **Step 5: Verify every agent parses**

Run: `node -e "import('./lib/frontmatter.mjs').then(({parseFrontmatter})=>{const fs=require('fs');for(const f of fs.readdirSync('agents')){const {data}=parseFrontmatter(fs.readFileSync('agents/'+f,'utf8'));if(!data.description||!data.tools)throw new Error(f)};console.log('agents ok',fs.readdirSync('agents').length)})"`
Expected: `agents ok 27`.

- [ ] **Step 6: CHECKPOINT — user review**

Show the user `git diff --stat agents/` and, for the three largest merges (`code-reviewer`, `java-reviewer`, `java-build-resolver`), the before/after line counts. Wait for explicit approval before committing.

- [ ] **Step 7: Run `make check` and commit**

```bash
make check
git add agents/ harness/reconcile-accepted.txt
git commit -m "feat(agents): reconcile canonical agents with live harness versions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Reconcile skills and commands (user checkpoint)

**Files:**
- Modify: `skills/*/SKILL.md` reported `MERGE`; `commands/*.md` reported `MERGE`
- Create: `commands/security-scan.md` (absorbed from Claude)
- Modify: `harness/reconcile-accepted.txt`

**Interfaces:**
- Consumes: `node scripts/reconcile-report.mjs --category skills|commands`.
- Produces: canonical skills/commands containing every live line (or an accepted replacement).

- [ ] **Step 1: List pending skills and commands**

Run: `node scripts/reconcile-report.mjs --category skills; node scripts/reconcile-report.mjs --category commands`
Expected: MERGE rows including `graphify`, `rules-distill`, `search-first`, `skill-scout`, `unified-memory` and the 19 shared commands where Claude and OpenCode differ; ABSORB `commands/security-scan (claude)`.

- [ ] **Step 2: Merge with the same rule as Task 2**

Apply the Task 2 merge rule to each MERGE skill and command. For commands whose OpenCode version names a subagent (`agent: build-error-resolver`, `agent: refactor-cleaner`), keep the `agent:`/`subtask:` frontmatter (OpenCode keeps all 27 agents).

- [ ] **Step 3: Absorb `security-scan`**

Copy `~/.claude/commands/security-scan.md` to `commands/security-scan.md`.

- [ ] **Step 4: Verify nothing is left**

Run: `node scripts/reconcile-report.mjs --check; echo exit=$?`
Expected: `0 pending` and `exit=0` across all categories.

- [ ] **Step 5: CHECKPOINT — user review**

Show `git diff --stat skills/ commands/` and wait for explicit approval.

- [ ] **Step 6: Run `make check` and commit**

```bash
make check
git add skills/ commands/ harness/reconcile-accepted.txt
git commit -m "feat(skills): reconcile canonical skills and commands with live harness versions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase 2 — Shared library

### Task 4: Agents and commands conversion library

**Files:**
- Create: `lib/agents.mjs`, `lib/commands.mjs`, `harness/claude-agents.txt`, `harness/codex-agent-overrides.json`
- Test: `test/test-agents.mjs`

**Interfaces:**
- Consumes: `parseFrontmatter` (Task 1).
- Produces:
  - `loadAgents(root) -> Array<{name, description, mode, tools, model?, body}>`
  - `toClaudeMarkdown(agent) -> string` (includes `<!-- managed-by: frankenbrain-lite -->`)
  - `toCodexToml(agent, overrides) -> string` (first line `# managed-by: frankenbrain-lite`)
  - `toOpenCodeAgent(agent) -> {description, mode, prompt, tools, model?}`
  - `readNameList(root, file) -> string[]`
  - `loadCommands(root) -> Array<{name, description, agent?, subtask?, template}>`
  - `toOpenCodeCommand(command) -> {template, description, agent?, subtask?}`
  - constant `MANAGED_MARKER = "managed-by: frankenbrain-lite"`

- [ ] **Step 1: Write the failing test**

```js
// test/test-agents.mjs
import assert from "node:assert/strict"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadAgents, toClaudeMarkdown, toCodexToml, toOpenCodeAgent, readNameList, MANAGED_MARKER } from "../lib/agents.mjs"
import { loadCommands, toOpenCodeCommand } from "../lib/commands.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const agents = loadAgents(root)
assert.equal(agents.length, 27)
const reviewer = agents.find((a) => a.name === "java-reviewer")
assert.ok(reviewer.description.length > 20)
assert.ok(reviewer.body.length > 200)

const claude = toClaudeMarkdown(reviewer)
assert.match(claude, /^---\nname: java-reviewer\ndescription: .+\ntools: Read, Grep, Glob, Bash\n---\n/)
assert.ok(claude.includes(MANAGED_MARKER))

const toml = toCodexToml(reviewer, {})
assert.ok(toml.startsWith(`# ${MANAGED_MARKER}\n`))
assert.match(toml, /\nname = "java-reviewer"\n/)
assert.match(toml, /\nsandbox_mode = "read-only"\n/)
const healer = agents.find((a) => a.name === "self-healer")
assert.match(toCodexToml(healer, { "self-healer": { model: "gpt-5.5", model_reasoning_effort: "high", sandbox_mode: "read-only" } }), /model = "gpt-5.5"/)

const oc = toOpenCodeAgent(reviewer)
assert.equal(oc.mode, "subagent")
assert.equal(oc.prompt, reviewer.body)
assert.equal(oc.model, undefined)

assert.equal(readNameList(root, "claude-agents.txt").length, 12)

const commands = loadCommands(root)
assert.ok(commands.length >= 24)
const plan = commands.find((c) => c.name === "plan")
assert.ok(toOpenCodeCommand(plan).template.length > 50)
console.log("AGENTS TEST PASS")
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node test/test-agents.mjs`
Expected: FAIL, `lib/agents.mjs` not found.

- [ ] **Step 3: Create the harness lists**

`harness/claude-agents.txt`:
```
# Agents installed for Claude Code (pruning decision 2026-08-25, kept by user decision 2026-09-25)
agent-evaluator
architect
code-reviewer
doc-updater
docs-lookup
harness-optimizer
java-build-resolver
java-reviewer
loop-operator
pr-test-analyzer
security-reviewer
silent-failure-hunter
```

`harness/codex-agent-overrides.json`:
```json
{
  "self-healer": { "model": "gpt-5.5", "model_reasoning_effort": "high", "sandbox_mode": "read-only" }
}
```

- [ ] **Step 4: Implement `lib/agents.mjs`**

```js
// lib/agents.mjs
// Canonical agent loading and per-harness conversion.
import fs from "node:fs"
import path from "node:path"
import { parseFrontmatter } from "./frontmatter.mjs"

export const MANAGED_MARKER = "managed-by: frankenbrain-lite"
const CLAUDE_TOOLS = { read: ["Read", "Grep", "Glob"], bash: ["Bash"], write: ["Write"], edit: ["Edit"], webfetch: ["WebFetch"], websearch: ["WebSearch"] }
const CLAUDE_MODELS = new Set(["sonnet", "opus", "haiku", "inherit"])

export function readNameList(root, file) {
  return fs.readFileSync(path.join(root, "harness", file), "utf8")
    .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
}

export function loadAgents(root) {
  const dir = path.join(root, "agents")
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((file) => {
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"))
    if (!data.description) throw new Error(`agent ${file} has no description`)
    return {
      name: file.slice(0, -3),
      description: String(data.description),
      mode: data.mode ?? "subagent",
      tools: typeof data.tools === "object" ? data.tools : {},
      model: typeof data.model === "string" ? data.model : undefined,
      body: body.trim(),
    }
  })
}

export function toClaudeMarkdown(agent) {
  const tools = [...new Set(Object.entries(agent.tools).filter(([, on]) => on).flatMap(([t]) => CLAUDE_TOOLS[t] ?? []))]
  const lines = ["---", `name: ${agent.name}`, `description: ${agent.description}`]
  if (tools.length) lines.push(`tools: ${tools.join(", ")}`)
  if (agent.model && CLAUDE_MODELS.has(agent.model)) lines.push(`model: ${agent.model}`)
  lines.push("---", `<!-- ${MANAGED_MARKER} -->`, "", agent.body, "")
  return lines.join("\n")
}

function tomlString(value) {
  return value.includes("'''") ? JSON.stringify(value) : `'''\n${value}'''`
}

export function toCodexToml(agent, overrides) {
  const extra = overrides[agent.name] ?? {}
  const readOnly = !agent.tools.write && !agent.tools.edit
  const lines = [`# ${MANAGED_MARKER}`, `name = ${JSON.stringify(agent.name)}`, `description = ${tomlString(agent.description)}`]
  if (extra.model) lines.push(`model = ${JSON.stringify(extra.model)}`)
  if (extra.model_reasoning_effort) lines.push(`model_reasoning_effort = ${JSON.stringify(extra.model_reasoning_effort)}`)
  lines.push(`sandbox_mode = ${JSON.stringify(extra.sandbox_mode ?? (readOnly ? "read-only" : "workspace-write"))}`)
  lines.push("", `developer_instructions = ${tomlString(agent.body)}`, "")
  return lines.join("\n")
}

export function toOpenCodeAgent(agent) {
  const config = { description: agent.description, mode: agent.mode, prompt: agent.body, tools: agent.tools }
  if (agent.model && agent.model.includes("/")) config.model = agent.model
  return config
}
```

- [ ] **Step 5: Implement `lib/commands.mjs`**

```js
// lib/commands.mjs
// Canonical command loading and OpenCode conversion.
import fs from "node:fs"
import path from "node:path"
import { parseFrontmatter } from "./frontmatter.mjs"

export function loadCommands(root) {
  const dir = path.join(root, "commands")
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((file) => {
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"))
    return {
      name: file.slice(0, -3),
      description: data.description ? String(data.description) : "",
      agent: typeof data.agent === "string" ? data.agent : undefined,
      subtask: data.subtask === true,
      template: body.trim(),
    }
  })
}

export function toOpenCodeCommand(command) {
  const config = { template: command.template, description: command.description }
  if (command.agent) config.agent = command.agent
  if (command.subtask) config.subtask = true
  return config
}
```

- [ ] **Step 6: Run the test and confirm it passes; validate generated TOML parses**

Run:
```bash
node test/test-agents.mjs
node -e "import('./lib/agents.mjs').then(m=>{const a=m.loadAgents('.');require('fs').writeFileSync('/tmp/fbl-agents-check.toml',m.toCodexToml(a[0],{}))})" && python3 -c "import tomllib;print(sorted(tomllib.load(open('/tmp/fbl-agents-check.toml','rb'))))"
```
Expected: `AGENTS TEST PASS`; then `['description', 'developer_instructions', 'name', 'sandbox_mode']`.

- [ ] **Step 7: Add to Makefile `test`, run `make check`, commit**

Add `	node test/test-agents.mjs` under `test:`.
```bash
make check
git add lib/agents.mjs lib/commands.mjs harness/claude-agents.txt harness/codex-agent-overrides.json test/test-agents.mjs Makefile
git commit -m "feat(lib): canonical agent and command conversion for Claude, Codex and OpenCode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: Instinct selection library

**Files:**
- Create: `lib/instincts.mjs`
- Test: `test/test-instincts.mjs`

**Interfaces:**
- Consumes: `parseFrontmatter`.
- Produces: `loadInstincts(dir, {minConfidence=0.6}) -> Array<{id, confidence, action}>`; `selectInstincts(list, {maxChars}) -> string[]` (lines `- [NN%] action`, near-duplicates removed, highest confidence first, total length ≤ maxChars); `resolveHomunculusDir(env, home) -> string`.

- [ ] **Step 1: Write the failing test**

```js
// test/test-instincts.mjs
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { loadInstincts, selectInstincts, resolveHomunculusDir } from "../lib/instincts.mjs"

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fbl-instincts-"))
const write = (name, confidence, action) => fs.writeFileSync(path.join(dir, `${name}.md`),
  `---\nid: ${name}\ntrigger: when x\nconfidence: ${confidence}\n---\n\n# T\n\n## Action\n${action}\n\n## Evidence\n- e\n`)
try {
  write("aws-a", 0.85, "Always prepend `export AWS_PROFILE=UrielReyna &&` and append `--region us-east-1` to AWS CLI commands that require authentication.")
  write("aws-b", 0.85, "Prepend `export AWS_PROFILE=UrielReyna &&` to every AWS CLI command that requires authentication (aws lambda, aws dynamodb).")
  write("low", 0.4, "Should be filtered by confidence.")
  write("other", 0.9, "Quote buildName in browserstack.yml.")
  fs.writeFileSync(path.join(dir, "broken.md"), "---\n- bad\n---\n")

  const list = loadInstincts(dir)
  assert.equal(list.length, 3)
  const lines = selectInstincts(list, { maxChars: 2000 })
  assert.equal(lines.length, 2, "near-duplicate AWS instinct must be removed")
  assert.match(lines[0], /^- \[90%\] Quote buildName/)
  assert.deepEqual(selectInstincts(list, { maxChars: 10 }), [])
} finally {
  fs.rmSync(dir, { recursive: true, force: true })
}
assert.equal(resolveHomunculusDir({ CLV2_HOMUNCULUS_DIR: "/x/h" }, "/home/u"), "/x/h")
assert.equal(resolveHomunculusDir({ XDG_DATA_HOME: "/d" }, "/home/u"), "/d/ecc-homunculus")
assert.equal(resolveHomunculusDir({}, "/home/u"), "/home/u/.local/share/ecc-homunculus")
console.log("INSTINCTS TEST PASS")
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node test/test-instincts.mjs`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```js
// lib/instincts.mjs
// Loads ECC instincts and selects a deduplicated, budgeted list for the bootstrap.
import fs from "node:fs"
import path from "node:path"
import { parseFrontmatter } from "./frontmatter.mjs"

const OVERLAP_THRESHOLD = 0.7

export function resolveHomunculusDir(env, home) {
  if (env.CLV2_HOMUNCULUS_DIR?.startsWith("/")) return env.CLV2_HOMUNCULUS_DIR
  if (env.XDG_DATA_HOME?.startsWith("/")) return path.join(env.XDG_DATA_HOME, "ecc-homunculus")
  return path.join(home, ".local", "share", "ecc-homunculus")
}

function extractAction(body) {
  const match = /##\s*Action\s*\n+([\s\S]*?)(?=\n##\s|$)/.exec(body)
  const first = (match ? match[1] : "").trim().split(/\n\s*\n/)[0] ?? ""
  return first.replace(/\s+/g, " ").trim()
}

export function loadInstincts(dir, { minConfidence = 0.6 } = {}) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).flatMap((file) => {
    try {
      const { data, body } = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"))
      const confidence = Number(data.confidence)
      const action = extractAction(body)
      if (!(confidence >= minConfidence) || !action) return []
      return [{ id: String(data.id ?? file.slice(0, -3)), confidence, action }]
    } catch {
      return []
    }
  })
}

const words = (text) => new Set(text.toLowerCase().match(/[a-z0-9_=-]{3,}/g) ?? [])

function isNearDuplicate(a, b) {
  let shared = 0
  for (const w of a) if (b.has(w)) shared++
  return shared / Math.max(1, Math.min(a.size, b.size)) >= OVERLAP_THRESHOLD
}

export function selectInstincts(list, { maxChars }) {
  const chosen = []
  const chosenWords = []
  let used = 0
  const ordered = [...list].sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))
  for (const item of ordered) {
    const itemWords = words(item.action)
    if (chosenWords.some((w) => isNearDuplicate(itemWords, w))) continue
    const line = `- [${Math.round(item.confidence * 100)}%] ${item.action}`
    if (used + line.length + 1 > maxChars) continue
    chosen.push(line)
    chosenWords.push(itemWords)
    used += line.length + 1
  }
  return chosen
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node test/test-instincts.mjs`
Expected: `INSTINCTS TEST PASS`

- [ ] **Step 5: Add to Makefile, `make check`, commit**

Add `	node test/test-instincts.mjs` under `test:`.
```bash
make check
git add lib/instincts.mjs test/test-instincts.mjs Makefile
git commit -m "feat(lib): deduplicated, budgeted instinct selection for the bootstrap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Bootstrap library, workflow rule and SessionStart entry

**Files:**
- Create: `lib/bootstrap.mjs`, `harness/facts.json`, `rules/common/frankenbrain-workflow.md`, `hooks/session-start.mjs`, `test/test-bootstrap.mjs`
- Delete: `rules/common/superpowers-workflow.md`
- Modify: `hooks/session-start` (becomes a Node launcher), `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` (import the new rule), `test/test-session-bootstrap.sh`, `test/test-workflow-integration.sh`

**Interfaces:**
- Consumes: `loadInstincts`, `selectInstincts`, `resolveHomunculusDir` (Task 5).
- Produces: `detectHarness(env) -> "claude"|"codex"|"opencode"|"unknown"`; `resolveVaultStatus(env, fsApi?) -> {available, root, contractPath, handoffIndexPath, reason}` (same shape as today); `buildBootstrap({root, harness, vaultStatus, instincts=[], maxChars=6000}) -> string`; `MAX_BOOTSTRAP_CHARS = 6000`.

- [ ] **Step 1: Write the failing test**

```js
// test/test-bootstrap.mjs
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildBootstrap, detectHarness, resolveVaultStatus, MAX_BOOTSTRAP_CHARS } from "../lib/bootstrap.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const STEPS = ["brainstorming", "writing-plans", "test-driven-development", "systematic-debugging",
  "requesting-code-review", "verification-before-completion", "handoffs-index", "learn-eval"]

assert.equal(detectHarness({ FRANKENBRAIN_HARNESS: "opencode" }), "opencode")
assert.equal(detectHarness({ CLAUDE_PLUGIN_ROOT: "/p" }), "claude")
assert.equal(detectHarness({ PLUGIN_ROOT: "/p" }), "codex")
assert.equal(detectHarness({}), "unknown")

const missing = resolveVaultStatus({})
for (const harness of ["claude", "codex", "opencode", "unknown"]) {
  const text = buildBootstrap({ root, harness, vaultStatus: missing })
  for (const step of STEPS) assert.ok(text.includes(step), `${harness} bootstrap lacks ${step}`)
  assert.ok(text.includes(`- Harness: ${harness}`))
  assert.match(text, /shared memory unavailable/i)
  assert.ok(text.length <= MAX_BOOTSTRAP_CHARS, `${harness} bootstrap too long: ${text.length}`)
  assert.ok(!/\/home\/[a-z]/.test(text), "bootstrap must not contain a personal path")
}

const instincts = Array.from({ length: 200 }, (_, i) => ({ id: `i${i}`, confidence: 0.9, action: `Unique lesson number ${i} ${"word".repeat(i % 7)} alpha${i} beta${i} gamma${i}` }))
const codex = buildBootstrap({ root, harness: "codex", vaultStatus: missing, instincts })
assert.match(codex, /## Learned instincts/)
assert.ok(codex.length <= MAX_BOOTSTRAP_CHARS)
assert.ok(codex.trim().endsWith("</frankenbrain-lite-bootstrap>"))

const vault = fs.mkdtempSync(path.join(os.tmpdir(), "fbl-vault-"))
try {
  fs.mkdirSync(path.join(vault, "memory", "handoffs"), { recursive: true })
  fs.writeFileSync(path.join(vault, "AGENTS.md"), "PRIVATE-VAULT-CONTRACT-SENTINEL")
  fs.writeFileSync(path.join(vault, "memory", "handoffs", "CURRENT.md"), "PRIVATE-HANDOFF-SENTINEL")
  const available = buildBootstrap({ root, harness: "claude", vaultStatus: resolveVaultStatus({ FRANKENBRAIN_VAULT_ROOT: vault }) })
  assert.ok(available.includes(path.join(vault, "AGENTS.md")))
  assert.ok(!available.includes("PRIVATE-"))
} finally {
  fs.rmSync(vault, { recursive: true, force: true })
}
console.log("BOOTSTRAP TEST PASS")
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node test/test-bootstrap.mjs`
Expected: FAIL, `lib/bootstrap.mjs` not found.

- [ ] **Step 3: Write the workflow rule**

`rules/common/frankenbrain-workflow.md`:
```markdown
# FrankenBrain workflow (Superpowers + ECC)

Superpowers leads the work; ECC closes the loop so the system learns from it.
For any request to build, create, add, implement, fix, or change behavior:

1. Design — load `brainstorming` and obey its approval gate.
2. Plan — on the architectural path, load `writing-plans` after the approved design.
3. Test first — load `test-driven-development`: RED → GREEN → REFACTOR.
4. Implement — `subagent-driven-development` or `executing-plans`; on any failure load `systematic-debugging` and find the root cause before fixing.
5. Review — load `requesting-code-review`; delegate to `code-reviewer`, `security-reviewer` or a language reviewer agent when one matches.
6. Verify — load `verification-before-completion` before any success claim, with fresh evidence.
7. Remember (ECC) — update your handoff thread and regenerate the index with `handoffs-index`; record reusable lessons with `growth-log` or `unified-memory`.
8. Improve (ECC) — run `learn-eval` after non-trivial or corrected work so lessons become instincts; periodically `evolve`, `prune`, `promote` and `rules-distill`.

Questions, read-only analysis and explanations skip steps 1–3; steps 7–8 apply only after real or corrected work.
If speed conflicts with a workflow gate, the gate wins.

## Routing

- Codebase architecture or "where is X": use `graphify` first when `graphify-out/graph.json` exists.
- Auth, secrets, user input or external APIs: `security-review` and the `security-reviewer` agent.
- Before writing new code: `search-first`.
- Agent run failed: `agent-introspection-debugging`.
```

- [ ] **Step 4: Write the harness facts**

`harness/facts.json`:
```json
{
  "claude": {
    "Skills": "plugin frankenbrain-lite (invoke as frankenbrain-lite:<skill>) and plugin superpowers",
    "Agents": "~/.claude/agents (12, generated by FrankenBrain-Lite)",
    "Commands": "plugin skills (/frankenbrain-lite:<command>)",
    "Helper": "fbl (on PATH): fbl instinct | fbl rules-scan skills|rules | fbl root",
    "Instincts": "injected by the ECC SessionStart hook",
    "Observer model": "haiku"
  },
  "opencode": {
    "Skills": "plugin frankenbrain-lite (skills path registered at startup) and plugin superpowers",
    "Agents": "registered by the FrankenBrain-Lite plugin (27)",
    "Commands": "/<command>, registered by the FrankenBrain-Lite plugin",
    "Helper": "fbl (on PATH): fbl instinct | fbl rules-scan skills|rules | fbl root",
    "Instincts": "injected by ecc-learning; idle-time analysis uses the active session model",
    "Observer model": "active session model"
  },
  "codex": {
    "Skills": "plugin frankenbrain-lite and plugin superpowers",
    "Agents": "~/.codex/agents/*.toml (27, generated by FrankenBrain-Lite)",
    "Commands": "not supported by Codex plugins; use the equivalent skill",
    "Helper": "fbl (on PATH): fbl instinct | fbl rules-scan skills|rules | fbl root",
    "Instincts": "listed below",
    "Observer model": "gpt-5.6-luna"
  },
  "unknown": {
    "Skills": "see the harness documentation",
    "Helper": "fbl (on PATH): fbl instinct | fbl rules-scan skills|rules | fbl root"
  }
}
```

- [ ] **Step 5: Implement `lib/bootstrap.mjs`**

```js
// lib/bootstrap.mjs
// Builds the FrankenBrain-Lite session bootstrap shared by every harness adapter.
import fs from "node:fs"
import path from "node:path"
import { selectInstincts } from "./instincts.mjs"

export const MAX_BOOTSTRAP_CHARS = 6000
const OPEN = "<frankenbrain-lite-bootstrap>"
const CLOSE = "</frankenbrain-lite-bootstrap>"

export function detectHarness(env) {
  if (env.FRANKENBRAIN_HARNESS) return env.FRANKENBRAIN_HARNESS
  if (env.CLAUDE_PLUGIN_ROOT) return "claude"
  if (env.PLUGIN_ROOT) return "codex"
  return "unknown"
}

export function resolveVaultStatus(env = process.env, fsApi = fs) {
  const configuredRoot = typeof env.FRANKENBRAIN_VAULT_ROOT === "string" ? env.FRANKENBRAIN_VAULT_ROOT.trim() : ""
  if (!configuredRoot) {
    return { available: false, root: null, contractPath: null, handoffIndexPath: null, reason: "FRANKENBRAIN_VAULT_ROOT is not configured" }
  }
  const root = path.resolve(configuredRoot)
  const contractPath = path.join(root, "AGENTS.md")
  const handoffIndexPath = path.join(root, "memory", "handoffs", "CURRENT.md")
  const available = fsApi.existsSync(root) && fsApi.existsSync(contractPath) && fsApi.existsSync(handoffIndexPath)
  return {
    available, root, contractPath, handoffIndexPath,
    reason: available ? "shared vault contract and handoff index are available" : "configured shared vault is missing its contract or handoff index",
  }
}

function memoryStatusText(status) {
  if (!status.available) return `Shared memory unavailable: ${status.reason}. Continue without inventing context or another store.`
  return [
    `Shared memory is available at ${JSON.stringify(status.root)}.`,
    `Read the public contract at ${JSON.stringify(status.contractPath)} and the handoff index at ${JSON.stringify(status.handoffIndexPath)} when relevant.`,
    "Do not inject or log note or memory bodies automatically.",
  ].join("\n")
}

function factsText(root, harness) {
  const all = JSON.parse(fs.readFileSync(path.join(root, "harness", "facts.json"), "utf8"))
  const facts = all[harness] ?? all.unknown
  return ["## Harness facts", `- Harness: ${harness}`, ...Object.entries(facts).map(([k, v]) => `- ${k}: ${v}`)].join("\n")
}

export function buildBootstrap({ root, harness, vaultStatus, instincts = [], maxChars = MAX_BOOTSTRAP_CHARS }) {
  const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").trim()
  const head = [OPEN, read("rules/common/frankenbrain-workflow.md"), "", factsText(root, harness), "",
    read("rules/common/persistent-memory.md"), "", memoryStatusText(vaultStatus)].join("\n")
  const title = "\n\n## Learned instincts\n"
  const room = maxChars - head.length - title.length - CLOSE.length - 2
  const lines = instincts.length && room > 0 ? selectInstincts(instincts, { maxChars: room }) : []
  const body = lines.length ? `${head}${title}${lines.join("\n")}` : head
  return `${body}\n${CLOSE}`
}
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `node test/test-bootstrap.mjs`
Expected: `BOOTSTRAP TEST PASS`. If a length assertion fails, shorten `frankenbrain-workflow.md` wording (never the step names).

- [ ] **Step 7: Replace the SessionStart entry**

`hooks/session-start.mjs`:
```js
#!/usr/bin/env node
// SessionStart entry for Claude Code and Codex. Never fails the session.
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildBootstrap, detectHarness, resolveVaultStatus } from "../lib/bootstrap.mjs"
import { loadInstincts, resolveHomunculusDir } from "../lib/instincts.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function emit(text) {
  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text } })}\n`)
}

try {
  const harness = detectHarness(process.env)
  const instinctDir = path.join(resolveHomunculusDir(process.env, os.homedir()), "instincts", "personal")
  const instincts = harness === "codex" ? loadInstincts(instinctDir) : []
  emit(buildBootstrap({ root, harness, vaultStatus: resolveVaultStatus(process.env), instincts }))
} catch (error) {
  process.stderr.write(`[frankenbrain-lite] bootstrap degraded: ${error.message}\n`)
  emit(`FrankenBrain-Lite bootstrap unavailable: ${error.message}`)
}
```

Replace the whole content of `hooks/session-start` with:
```bash
#!/usr/bin/env bash
# Launcher kept for hooks/run-hook.cmd compatibility; the logic lives in session-start.mjs.
set -euo pipefail
exec node "$(cd "$(dirname "$0")" && pwd)/session-start.mjs"
```

- [ ] **Step 8: Swap the workflow rule everywhere**

```bash
git rm rules/common/superpowers-workflow.md
sed -i 's#@rules/common/superpowers-workflow.md#@rules/common/frankenbrain-workflow.md#' CLAUDE.md
sed -i 's#@./rules/common/superpowers-workflow.md#@./rules/common/frankenbrain-workflow.md#' GEMINI.md
grep -rn "superpowers-workflow" --include=*.md --include=*.json --include=*.js --include=*.mjs --include=*.sh . | grep -v "^./docs/\|^./graphify-out/"
```
Expected: the final grep prints nothing (fix any remaining reference, e.g. in `AGENTS.md`, by pointing it to `rules/common/frankenbrain-workflow.md`).

- [ ] **Step 9: Update the shell bootstrap test**

In `test/test-session-bootstrap.sh`, replace the workflow-name loop with the 8 step names and add a Codex case:
```bash
for expected in brainstorming writing-plans test-driven-development systematic-debugging requesting-code-review verification-before-completion handoffs-index learn-eval; do
  grep -q "$expected" "$missing_output" || fail "missing workflow name: $expected"
done
grep -q '"hookSpecificOutput"' "$missing_output" || fail "missing hookSpecificOutput"

codex_output="$TMP_ROOT/codex.json"
env -u CLAUDE_PLUGIN_ROOT PLUGIN_ROOT="$TMP_ROOT/codex-plugin" CLV2_HOMUNCULUS_DIR="$TMP_ROOT/homunculus" \
  FRANKENBRAIN_VAULT_ROOT= bash "$ROOT/hooks/session-start" >"$codex_output"
python3 -m json.tool "$codex_output" >/dev/null || fail "codex output is not JSON"
grep -q 'Harness: codex' "$codex_output" || fail "codex harness not detected"
```

- [ ] **Step 10: Update the integration test for the new rule**

In `test/test-workflow-integration.sh`: replace `rules/common/superpowers-workflow.md` with `rules/common/frankenbrain-workflow.md` in `required_files`, in the `assert_contains` loop, and in the `CLAUDE.md`/`GEMINI.md` import assertions; add `lib/bootstrap.mjs`, `hooks/session-start.mjs`, `harness/facts.json` to `required_files`.

- [ ] **Step 11: Update the OpenCode plugin test import**

In `test/test-opencode-plugin.mjs`, change the bootstrap assertion `part.text.includes("Mandatory Superpowers workflow")` to `part.text.includes("FrankenBrain workflow")`. (The adapter itself is rewritten in Task 8; this keeps `make check` green now because the current adapter reads `superpowers-workflow.md` — also change its `workflowRulePath` to `rules/common/frankenbrain-workflow.md`.)

- [ ] **Step 12: Run everything and commit**

Add `	node test/test-bootstrap.mjs` under `test:`.
```bash
make check
git add -A lib/bootstrap.mjs harness/facts.json rules/common hooks/session-start hooks/session-start.mjs CLAUDE.md GEMINI.md AGENTS.md test/ .opencode/plugins/frankenbrain.js Makefile
git commit -m "feat(bootstrap): shared 8-step FrankenBrain bootstrap with harness facts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase 3 — Harness surfaces

### Task 7: Neutral skills, retired skills and the `fbl` helper

**Files:**
- Delete: `skills/brainstorming/`, `skills/writing-plans/`, `skills/test-driven-development/`, `skills/systematic-debugging/`, `skills/verification-before-completion/`, `skills/using-dev/`
- Create: `bin/fbl`, `test/test-skill-neutrality.sh`
- Modify: `skills/blueprint/SKILL.md`, `skills/skill-scout/SKILL.md`, `skills/continuous-learning-v2/SKILL.md`, `skills/rules-distill/SKILL.md`, `skills/superapp-dashboard-storytelling/SKILL.md`, `skills/search-first/SKILL.md`, `commands/evolve.md`, `commands/instinct-status.md`, `commands/promote.md`, `commands/prune.md`, `commands/projects.md`, `test/test-workflow-integration.sh`, `test/test-plugin-loaders.sh`

**Interfaces:**
- Produces: `bin/fbl {instinct|rules-scan skills|rules-scan rules|migrate-homunculus|root}`.

Neutrality rule: no skill or command may reference a harness skills directory (`~/.claude/skills`, `~/.config/opencode/skills`, `~/.codex/skills`, `~/.agents/skills`). Paths that are the subject of a skill (e.g. `config-gc` managing `~/.claude/settings.json`, `delivery-gate` installing `~/.claude/scripts/quality-gate.py`) stay.

- [ ] **Step 1: Write the failing neutrality test**

```bash
#!/usr/bin/env bash
# test/test-skill-neutrality.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
fail() { echo "SKILL NEUTRALITY TEST ERROR: $1" >&2; exit 1; }

matches="$(grep -rnE '~/\.(claude|config/opencode|codex|agents)/skills' skills commands agents || true)"
[[ -z "$matches" ]] || fail "harness skills paths found:
$matches"

for retired in brainstorming writing-plans test-driven-development systematic-debugging verification-before-completion using-dev; do
  [[ ! -e "skills/$retired" ]] || fail "retired skill still present: $retired"
done

[[ "$(find skills -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l)" -eq 32 ]] || fail "expected 32 skills"
"$ROOT/bin/fbl" root | grep -qx "$ROOT" || fail "fbl root does not resolve the repository"
"$ROOT/bin/fbl" instinct --help >/dev/null 2>&1 || fail "fbl instinct is not runnable"
echo "SKILL NEUTRALITY TEST PASS"
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bash test/test-skill-neutrality.sh`
Expected: FAIL listing the harness path matches (baseline: blueprint, skill-scout, continuous-learning-v2, rules-distill, superapp-dashboard-storytelling, search-first, config-gc line 34/86, and five commands).

- [ ] **Step 3: Create the helper**

`bin/fbl`:
```bash
#!/usr/bin/env bash
# Stable entry point for FrankenBrain-Lite helper scripts, independent of harness skill directories.
set -euo pipefail
SELF="$(readlink -f "${BASH_SOURCE[0]}")"
ROOT="$(cd "$(dirname "$SELF")/.." && pwd)"

usage() { echo "usage: fbl {instinct|rules-scan skills|rules-scan rules|migrate-homunculus|root} [args...]" >&2; exit 2; }
[[ $# -ge 1 ]] || usage
command="$1"; shift
case "$command" in
  instinct) exec python3 "$ROOT/skills/continuous-learning-v2/scripts/instinct-cli.py" "$@" ;;
  rules-scan)
    target="${1:-}"; shift || true
    case "$target" in
      skills) exec bash "$ROOT/skills/rules-distill/scripts/scan-skills.sh" "$@" ;;
      rules) exec bash "$ROOT/skills/rules-distill/scripts/scan-rules.sh" "$@" ;;
      *) usage ;;
    esac ;;
  migrate-homunculus) exec bash "$ROOT/skills/continuous-learning-v2/scripts/migrate-homunculus.sh" "$@" ;;
  root) echo "$ROOT" ;;
  *) usage ;;
esac
```
Run: `chmod +x bin/fbl`

- [ ] **Step 4: Retire the six skills**

```bash
git rm -r skills/brainstorming skills/writing-plans skills/test-driven-development skills/systematic-debugging skills/verification-before-completion skills/using-dev
git rm -r skills/.kiro   # stray mirror created by the old harvest (audit H6); .kiro/ itself is untouched
```
Add to `test/test-skill-neutrality.sh`: `[[ ! -e skills/.kiro ]] || fail "stray skills/.kiro present"`.

- [ ] **Step 5: Rewrite command invocations to use `fbl`**

Apply exactly:
- `commands/evolve.md`: `python3 ~/.config/opencode/skills/continuous-learning-v2/scripts/instinct-cli.py evolve $ARGUMENTS` → `fbl instinct evolve $ARGUMENTS`
- `commands/instinct-status.md`: `python3 ~/.config/opencode/skills/continuous-learning-v2/scripts/instinct-cli.py status` → `fbl instinct status`
- `commands/prune.md`: `python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py prune` → `fbl instinct prune`
- `commands/promote.md` and `commands/projects.md`: replace the whole fenced block and the "If … is unavailable, use:" fallback with a single block `fbl instinct promote $ARGUMENTS` / `fbl instinct projects`.

- [ ] **Step 6: Rewrite skill references neutrally**

Apply exactly:
- `skills/rules-distill/SKILL.md`: `bash ~/.config/opencode/skills/rules-distill/scripts/scan-skills.sh` → `fbl rules-scan skills`; `… scan-rules.sh` → `fbl rules-scan rules`.
- `skills/continuous-learning-v2/SKILL.md`: `bash ~/.config/opencode/skills/continuous-learning-v2/scripts/migrate-homunculus.sh` → `fbl migrate-homunculus`; `CLI=~/.config/opencode/skills/continuous-learning-v2/scripts/instinct-cli.py` → `CLI="fbl instinct"`; replace the "Claude Code only — manual install" block (lines around 173–190) with: `FrankenBrain-Lite registers the observation hooks through its plugin (Claude and Codex) and the ecc-learning plugin (OpenCode); no manual settings.json edit is needed.`; `Existing ~/.claude/skills/learned/ skills from v1 still work` → `Existing learned skills from v1 still work`.
- `skills/skill-scout/SKILL.md` lines 45 and 52: replace the directory arguments with `$(fbl root)/skills` and add the sentence `Also list the harness skills directory named in the bootstrap "Harness facts".`
- `skills/search-first/SKILL.md` line 76: `ls ~/.claude/skills ~/.config/opencode/skills ~/.codex/skills` → `ls "$(fbl root)/skills"` plus "the harness skills directory from Harness facts"; line 85: `Check ~/.config/opencode/skills/ and ~/.claude/skills/` → `Check "$(fbl root)/skills" and the harness skills from Harness facts`.
- `skills/blueprint/SKILL.md` line 97: `into ~/.claude/skills/blueprint/SKILL.md` → `into the FrankenBrain-Lite repository (\`$(fbl root)/skills/blueprint/SKILL.md\`) and run \`make update\``.
- `skills/superapp-dashboard-storytelling/SKILL.md` line 88: replace the copy list with `edit the skill in the FrankenBrain-Lite repository, run make security && make validate, then make update`.
- `skills/config-gc/SKILL.md` line 34 and 86: `~/.claude/skills/*/` → `the harness skills directory (Harness facts)`; `mv ~/.claude/skills/dead-skill …` → `mv <harness-skills-dir>/dead-skill ~/.claude/_gc_trash/$gc_date/`.

- [ ] **Step 7: Update tests that referenced the retired skills**

- `test/test-workflow-integration.sh`: change the `CORE_SKILLS` loop to `[[ ! -e "skills/$skill" ]] || fail "retired skill present: $skill"`; change `assert_contains AGENTS.md brainstorming` lines to check `frankenbrain-workflow.md`; change the README assertions from `skills-36` / `| 36 |` to `skills-32` / `| 32 |` (README is updated in Task 13; until then update README's two count spots to 32 in this task).
- `test/test-plugin-loaders.sh`: replace the loop over the five workflow skills with `for skill in growth-log search-first graphify; do …`.

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `bash test/test-skill-neutrality.sh && make check`
Expected: `SKILL NEUTRALITY TEST PASS` and `make check` exit 0.

- [ ] **Step 9: Add to Makefile, commit**

Add `	bash test/test-skill-neutrality.sh` under `test:`.
```bash
git add -A bin/fbl skills commands test Makefile README.md AGENTS.md
git commit -m "feat(skills): harness-neutral skills, retire duplicated workflow skills, add fbl helper

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: OpenCode adapter registers agents and commands

**Files:**
- Modify: `.opencode/plugins/frankenbrain.js`
- Modify: `test/test-opencode-plugin.mjs`, `test/test-plugin-loaders.sh`

**Interfaces:**
- Consumes: `loadAgents`, `toOpenCodeAgent`, `loadCommands`, `toOpenCodeCommand`, `buildBootstrap`, `resolveVaultStatus`.
- Produces: default export `FrankenBrainPlugin` with hooks `config` and `experimental.chat.messages.transform`; re-export `resolveVaultStatus`.

- [ ] **Step 1: Update the test first**

Replace the body of `test/test-opencode-plugin.mjs` after the imports with:
```js
import assert from "node:assert/strict"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { FrankenBrainPlugin } from "../.opencode/plugins/frankenbrain.js"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const plugin = await FrankenBrainPlugin({ directory: packageRoot })

const config = { agent: { "java-reviewer": { description: "user override" } } }
await plugin.config(config)
await plugin.config(config)
assert.deepEqual(config.skills.paths, [path.join(packageRoot, "skills")])
assert.equal(Object.keys(config.agent).length, 27)
assert.equal(config.agent["java-reviewer"].description, "user override", "existing config must win")
assert.equal(config.agent["self-healer"].mode, "subagent")
assert.ok(config.command.plan.template.length > 50)

const output = { messages: [{ info: { role: "user" }, parts: [{ type: "text", text: "hello" }] }] }
await plugin["experimental.chat.messages.transform"]({}, output)
await plugin["experimental.chat.messages.transform"]({}, output)
const injected = output.messages[0].parts.filter((p) => p.type === "text" && p.text.includes("FrankenBrain workflow"))
assert.equal(injected.length, 1)
assert.ok(injected[0].text.includes("- Harness: opencode"))
assert.equal(output.messages[0].parts.at(-1).text, "hello")
console.log("OPENCODE PLUGIN TEST PASS")
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node test/test-opencode-plugin.mjs`
Expected: FAIL on `Object.keys(config.agent).length` (undefined agents).

- [ ] **Step 3: Rewrite the adapter**

```js
// .opencode/plugins/frankenbrain.js
// Executable compatibility target: OpenCode 1.18.32 V1 plugin API.
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildBootstrap, resolveVaultStatus } from "../../lib/bootstrap.mjs"
import { loadAgents, toOpenCodeAgent } from "../../lib/agents.mjs"
import { loadCommands, toOpenCodeCommand } from "../../lib/commands.mjs"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
export { resolveVaultStatus }

function registerAll(config) {
  config.skills ??= {}
  config.skills.paths ??= []
  const skillsPath = path.join(packageRoot, "skills")
  if (!config.skills.paths.includes(skillsPath)) config.skills.paths.push(skillsPath)
  config.agent ??= {}
  for (const agent of loadAgents(packageRoot)) config.agent[agent.name] ??= toOpenCodeAgent(agent)
  config.command ??= {}
  for (const command of loadCommands(packageRoot)) config.command[command.name] ??= toOpenCodeCommand(command)
}

export const FrankenBrainPlugin = async () => {
  let bootstrapInjected = false
  return {
    config: async (config) => {
      try {
        registerAll(config)
      } catch (error) {
        console.error(`[frankenbrain-lite] registration degraded: ${error.message}`)
      }
    },
    "experimental.chat.messages.transform": async (_input, output) => {
      if (bootstrapInjected || !Array.isArray(output.messages)) return
      const first = output.messages.find((m) => m?.info?.role === "user" && Array.isArray(m.parts))
      if (!first) return
      let text
      try {
        text = buildBootstrap({ root: packageRoot, harness: "opencode", vaultStatus: resolveVaultStatus(process.env) })
      } catch (error) {
        text = `FrankenBrain-Lite bootstrap unavailable: ${error.message}`
      }
      first.parts.unshift({ type: "text", text })
      bootstrapInjected = true
    },
  }
}

export default FrankenBrainPlugin
```

- [ ] **Step 4: Run the unit test and confirm it passes**

Run: `node test/test-opencode-plugin.mjs`
Expected: `OPENCODE PLUGIN TEST PASS`

- [ ] **Step 5: Extend the live loader test**

In `test/test-plugin-loaders.sh`, inside the `opencode` branch after the skill loop, add:
```bash
  agents_output="$TMP_ROOT/opencode-agents.txt"
  HOME="$TMP_ROOT/home" XDG_CONFIG_HOME="$TMP_ROOT/config" XDG_DATA_HOME="$TMP_ROOT/data" XDG_CACHE_HOME="$TMP_ROOT/cache" \
  OPENCODE_DISABLE_AUTOUPDATE=1 OPENCODE_DISABLE_MODELS_FETCH=1 OPENCODE_DISABLE_DEFAULT_PLUGINS=1 OPENCODE_DISABLE_PROJECT_CONFIG=1 \
  timeout 60s opencode agent list >"$agents_output" || fail "OpenCode agent list failed"
  for agent in java-reviewer self-healer code-reviewer; do
    grep -q "^$agent (subagent)" "$agents_output" || fail "OpenCode did not register agent: $agent"
  done
  echo "OPENCODE AGENT REGISTRATION PASS"
```

- [ ] **Step 6: Run `make check` and commit**

```bash
make check
git add .opencode/plugins/frankenbrain.js test/test-opencode-plugin.mjs test/test-plugin-loaders.sh
git commit -m "feat(opencode): register agents and commands from the repository

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: Claude and Codex manifests, hooks and Codex catalog

**Files:**
- Modify: `.claude-plugin/plugin.json` (add `"agents": []`), `.codex-plugin/plugin.json` (`"hooks": "./hooks/codex-hooks.json"`), `hooks/hooks.json`
- Create: `hooks/codex-hooks.json`, `.agents/plugins/marketplace.json`
- Modify: `skills/continuous-learning-v2/hooks/observe.sh` (record `harness`)
- Modify: `scripts/validate.sh`, `test/test-plugin-loaders.sh`

**Interfaces:**
- Produces: Claude hook events `SessionStart`, `PreToolUse`, `PostToolUse`; Codex hook events the same; observations carry `"harness": "claude"|"codex"`.

- [ ] **Step 1: Write the failing loader assertions**

Append to `test/test-plugin-loaders.sh` before the Codex echo line:
```bash
python3 - "$ROOT" <<'PY' || fail "manifest contract"
import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
claude = json.loads((root / ".claude-plugin/plugin.json").read_text())
assert claude.get("agents") == [], "Claude manifest must ship agents: []"
codex = json.loads((root / ".codex-plugin/plugin.json").read_text())
assert codex["hooks"] == "./hooks/codex-hooks.json"
hooks = json.loads((root / "hooks/codex-hooks.json").read_text())["hooks"]
for event in ("SessionStart", "PreToolUse", "PostToolUse"):
    assert event in hooks, event
catalog = json.loads((root / ".agents/plugins/marketplace.json").read_text())
assert catalog["plugins"][0]["source"] == {"source": "local", "path": "./"}
claude_hooks = json.loads((root / "hooks/hooks.json").read_text())["hooks"]
assert "PostToolUse" in claude_hooks and "PreToolUse" in claude_hooks
PY
echo "MANIFEST CONTRACT PASS"

if command -v codex >/dev/null 2>&1; then
  codex_home="$TMP_ROOT/codex-home"; mkdir -p "$codex_home"
  CODEX_HOME="$codex_home" timeout 120s codex plugin marketplace add "$ROOT" >/dev/null 2>&1 || fail "codex marketplace add failed"
  CODEX_HOME="$codex_home" timeout 120s codex plugin add frankenbrain-lite@frankenbrain-lite >/dev/null 2>&1 || fail "codex plugin add failed"
  find "$codex_home/plugins/cache/frankenbrain-lite" -name SKILL.md -path '*growth-log*' | grep -q . || fail "codex cache lacks skills"
  echo "CODEX LOCAL MARKETPLACE INSTALL PASS"
fi
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bash test/test-plugin-loaders.sh`
Expected: FAIL `manifest contract`.

- [ ] **Step 3: Update the Claude manifest and hooks**

In `.claude-plugin/plugin.json` add the key `"agents": []`.

Replace `hooks/hooks.json` with:
```json
{
  "hooks": {
    "SessionStart": [
      { "matcher": "startup|clear|compact", "hooks": [ { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start", "shell": "bash", "async": false } ] }
    ],
    "PreToolUse": [
      { "matcher": "Bash|Edit|Write|MultiEdit|NotebookEdit", "hooks": [ { "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/hooks/observe.sh\" pre" } ] }
    ],
    "PostToolUse": [
      { "matcher": "Bash|Edit|Write|MultiEdit|NotebookEdit", "hooks": [ { "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/hooks/observe.sh\" post" } ] }
    ]
  }
}
```

- [ ] **Step 4: Create the Codex hooks and catalog**

`hooks/codex-hooks.json`:
```json
{
  "description": "FrankenBrain-Lite Codex hooks: bootstrap and observation capture.",
  "hooks": {
    "SessionStart": [
      { "matcher": "*", "hooks": [ { "type": "command", "command": "bash \"$PLUGIN_ROOT/hooks/session-start\"" } ] }
    ],
    "PreToolUse": [
      { "matcher": "*", "hooks": [ { "type": "command", "command": "ECC_HARNESS=codex ECC_OBSERVER_BACKEND=codex bash \"$PLUGIN_ROOT/skills/continuous-learning-v2/hooks/observe.sh\" pre" } ] }
    ],
    "PostToolUse": [
      { "matcher": "*", "hooks": [ { "type": "command", "command": "ECC_HARNESS=codex ECC_OBSERVER_BACKEND=codex bash \"$PLUGIN_ROOT/skills/continuous-learning-v2/hooks/observe.sh\" post" } ] }
    ]
  }
}
```

In `.codex-plugin/plugin.json` set `"hooks": "./hooks/codex-hooks.json"`.

`.agents/plugins/marketplace.json`:
```json
{
  "name": "frankenbrain-lite",
  "interface": { "displayName": "FrankenBrain Lite" },
  "plugins": [
    {
      "name": "frankenbrain-lite",
      "version": "0.3.0",
      "source": { "source": "local", "path": "./" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
```
Bump `"version"` to `0.3.0` in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json` and `package.json`.

- [ ] **Step 5: Record the harness in observations**

In `skills/continuous-learning-v2/hooks/observe.sh`, in the Python block that builds `observation = {…}`, add the entry after `"project_name"`:
```python
    "project_name": os.environ.get("PROJECT_NAME_ENV", "global"),
    "harness": os.environ.get("ECC_HARNESS", "claude")
```
(keep the comma on the `project_name` line).

- [ ] **Step 6: Validate the Codex manifest paths**

In `scripts/validate.sh`, inside the Python manifest block after `validate_reference("Codex hooks", codex["hooks"])`, add:
```python
    catalog = load(".agents/plugins/marketplace.json")
    validate_reference("Codex catalog source", catalog["plugins"][0]["source"]["path"])
```

- [ ] **Step 7: Run and commit**

Run: `bash test/test-plugin-loaders.sh && make check`
Expected: `MANIFEST CONTRACT PASS`, `CODEX LOCAL MARKETPLACE INSTALL PASS`, `make check` exit 0.
```bash
git add .claude-plugin .codex-plugin hooks .agents package.json skills/continuous-learning-v2/hooks/observe.sh scripts/validate.sh test/test-plugin-loaders.sh
git commit -m "feat(plugins): Claude/Codex hooks with observation capture and Codex marketplace catalog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10: Observer analyzer per backend

**Files:**
- Create: `skills/continuous-learning-v2/agents/analyzer-command.sh`, `test/test-observer-backend.sh`
- Modify: `skills/continuous-learning-v2/agents/observer-loop.sh`, `skills/continuous-learning-v2/agents/start-observer.sh`, `skills/continuous-learning-v2/config.json`

**Interfaces:**
- Produces: `analyzer-command.sh <backend> <model> <max_turns> <workdir>` prints one argv element per line; the caller appends the prompt. Env consumed by the loop: `ECC_OBSERVER_BACKEND` (`claude`|`codex`), `ECC_OBSERVER_MODEL`.

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
# test/test-observer-backend.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CMD="$ROOT/skills/continuous-learning-v2/agents/analyzer-command.sh"
fail() { echo "OBSERVER BACKEND TEST ERROR: $1" >&2; exit 1; }

claude_argv="$(bash "$CMD" claude "" 10 /tmp/h | tr '\n' ' ')"
[[ "$claude_argv" == "claude --model haiku --max-turns 10 --print --allowedTools Read,Write -p " ]] || fail "claude argv: $claude_argv"
codex_argv="$(bash "$CMD" codex "" 10 /tmp/h | tr '\n' ' ')"
[[ "$codex_argv" == "codex exec --skip-git-repo-check --ephemeral -m gpt-5.6-luna --sandbox workspace-write -C /tmp/h " ]] || fail "codex argv: $codex_argv"
[[ "$(bash "$CMD" codex gpt-x 10 /tmp/h | sed -n 5p)" == "gpt-x" ]] || fail "model override ignored"
if bash "$CMD" nope "" 10 /tmp/h 2>/dev/null; then fail "unknown backend accepted"; fi
grep -q 'analyzer-command.sh' "$ROOT/skills/continuous-learning-v2/agents/observer-loop.sh" || fail "observer-loop does not use analyzer-command.sh"
python3 -c "import json,sys; m=json.load(open(sys.argv[1]))['observer']['models']; assert m=={'claude':'haiku','codex':'gpt-5.6-luna','opencode':'session'}, m" "$ROOT/skills/continuous-learning-v2/config.json" || fail "config models"
echo "OBSERVER BACKEND TEST PASS"
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bash test/test-observer-backend.sh`
Expected: FAIL (script not found).

- [ ] **Step 3: Implement the argv builder**

`skills/continuous-learning-v2/agents/analyzer-command.sh`:
```bash
#!/usr/bin/env bash
# Prints the observer analyzer argv, one element per line, for the given backend.
# The caller appends the prompt as the final argument.
set -euo pipefail
backend="${1:?backend}"
model="${2:-}"
max_turns="${3:-10}"
workdir="${4:?workdir}"
case "$backend" in
  claude) printf '%s\n' claude --model "${model:-haiku}" --max-turns "$max_turns" --print --allowedTools "Read,Write" -p ;;
  codex) printf '%s\n' codex exec --skip-git-repo-check --ephemeral -m "${model:-gpt-5.6-luna}" --sandbox workspace-write -C "$workdir" ;;
  *) echo "unknown observer backend: $backend" >&2; exit 2 ;;
esac
```

- [ ] **Step 4: Use it in `observer-loop.sh`**

Replace
```bash
  if ! command -v claude >/dev/null 2>&1; then
    echo "[$(date)] claude CLI not found, skipping analysis" >> "$LOG_FILE"
    return
  fi
```
with
```bash
  analyzer_backend="${ECC_OBSERVER_BACKEND:-claude}"
  if ! command -v "$analyzer_backend" >/dev/null 2>&1; then
    echo "[$(date)] ${analyzer_backend} CLI not found, skipping analysis" >> "$LOG_FILE"
    return
  fi
```
and replace
```bash
  ECC_SKIP_OBSERVE=1 ECC_HOOK_PROFILE=minimal claude --model "${ECC_OBSERVER_MODEL:-haiku}" --max-turns "$max_turns" --print \
    --allowedTools "Read,Write" \
    -p "$prompt_content" < /dev/null >&8 2>> "$LOG_FILE" &
```
with
```bash
  analyzer_cmd=()
  while IFS= read -r analyzer_arg; do analyzer_cmd+=("$analyzer_arg"); done < <(
    bash "${SCRIPT_DIR}/analyzer-command.sh" "$analyzer_backend" "${ECC_OBSERVER_MODEL:-}" "$max_turns" "$CONFIG_DIR")
  ECC_SKIP_OBSERVE=1 ECC_HOOK_PROFILE=minimal "${analyzer_cmd[@]}" "$prompt_content" < /dev/null >&8 2>> "$LOG_FILE" &
```
(the surrounding `set -m` / `CLAUDE_PID=$!` lines stay unchanged).

- [ ] **Step 5: Resolve the model in `start-observer.sh`**

In the Python config block add a fourth `print`:
```python
print((obs.get('models') or {}).get(os.environ.get('ECC_OBSERVER_BACKEND', 'claude'), ''))
```
change the fallback `|| echo "5\n20\nfalse"` to include a fourth empty line (`echo "5
20
false
"`), and after `_enabled=…` add:
```bash
    _model=$(echo "$_config" | sed -n '4p')
    if [ -z "${ECC_OBSERVER_MODEL:-}" ] && [ -n "$_model" ] && [ "$_model" != "session" ]; then
      ECC_OBSERVER_MODEL="$_model"
    fi
```
In the `nohup env` list add:
```bash
      ECC_OBSERVER_BACKEND="${ECC_OBSERVER_BACKEND:-claude}" \
      ECC_OBSERVER_MODEL="${ECC_OBSERVER_MODEL:-}" \
```

- [ ] **Step 6: Add the model map (observer stays disabled until Task 17)**

`skills/continuous-learning-v2/config.json`:
```json
{
  "version": "2.1",
  "observer": {
    "enabled": false,
    "run_interval_minutes": 5,
    "min_observations_to_analyze": 20,
    "models": { "claude": "haiku", "codex": "gpt-5.6-luna", "opencode": "session" }
  }
}
```

- [ ] **Step 7: Run and commit**

Run: `bash test/test-observer-backend.sh && bash -n skills/continuous-learning-v2/agents/observer-loop.sh && bash -n skills/continuous-learning-v2/agents/start-observer.sh && make check`
Expected: `OBSERVER BACKEND TEST PASS`, no syntax errors, `make check` exit 0.
Add `	bash test/test-observer-backend.sh` under `test:`.
```bash
git add skills/continuous-learning-v2 test/test-observer-backend.sh Makefile
git commit -m "feat(learning): observer analyzer per backend (claude haiku, codex gpt-5.6-luna)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11: `learn-eval` command writing to the single source

**Files:**
- Create: `commands/learn-eval.md` (from `~/projects/ECC/commands/learn-eval.md`)

**Interfaces:**
- Produces: `/learn-eval` saves global skills to `$(fbl root)/skills/<pattern-name>/SKILL.md` and project skills to `.claude/skills/<pattern-name>/SKILL.md` in the current project.

- [ ] **Step 1: Copy the command**

Run: `cp ~/projects/ECC/commands/learn-eval.md commands/learn-eval.md`

- [ ] **Step 2: Confirm the neutrality test fails**

Run: `bash test/test-skill-neutrality.sh`
Expected: FAIL listing `commands/learn-eval.md` lines with `~/.claude/skills`.

- [ ] **Step 3: Point global saves at the repository**

In `commands/learn-eval.md` replace every `~/.claude/skills/<pattern-name>/SKILL.md` with `$(fbl root)/skills/<pattern-name>/SKILL.md`, every other `~/.claude/skills/` with `$(fbl root)/skills/`, and add after the save-location section:
```markdown
After writing a Global skill, run `make security && make validate && make update` in `$(fbl root)` so every harness receives it.
```

- [ ] **Step 4: Run and commit**

Run: `bash test/test-skill-neutrality.sh && make check`
Expected: PASS.
```bash
git add commands/learn-eval.md
git commit -m "feat(commands): add learn-eval saving global lessons to the FrankenBrain-Lite repository

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase 4 — Installer

### Task 12: Installer core, per-harness steps and verification

**Files:**
- Create: `scripts/fbl-install.mjs`, `scripts/install/common.mjs`, `scripts/install/claude.mjs`, `scripts/install/opencode.mjs`, `scripts/install/codex.mjs`, `scripts/install/verify.mjs`
- Test: `test/test-install.mjs`

**Interfaces:**
- Consumes: `loadAgents`, `toClaudeMarkdown`, `toCodexToml`, `readNameList`, `MANAGED_MARKER`, `loadCommands`.
- Produces: CLI `node scripts/fbl-install.mjs <install|update|uninstall|verify> [--harness claude|opencode|codex|all]`; env `FBL_HOME` (default `os.homedir()`), `FBL_SKIP_CLI=1` (skip `claude`/`codex` CLI calls, used by tests), `FBL_DATE` (default today, `YYYY-MM-DD`). State file `<home>/.local/share/frankenbrain/install-state.json` = `{ moves: [{from, to}], created: [path], edits: [{file, backup}] }`.

- [ ] **Step 1: Write the failing end-to-end test**

```js
// test/test-install.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const home = fs.mkdtempSync(path.join(os.tmpdir(), "fbl-install-"))
const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(home, rel)), { recursive: true }); fs.writeFileSync(path.join(home, rel), text) }
const exists = (rel) => fs.existsSync(path.join(home, rel))
const run = (...args) => execFileSync("node", [path.join(root, "scripts/fbl-install.mjs"), ...args],
  { env: { ...process.env, FBL_HOME: home, FBL_SKIP_CLI: "1", FBL_DATE: "2026-09-25" }, encoding: "utf8" })

function snapshot() {
  const out = {}
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name); if (e.isDirectory()) walk(full); else out[path.relative(home, full)] = fs.readFileSync(full, "utf8") } }
  walk(home)
  return out
}

try {
  put(".claude/skills/growth-log/SKILL.md", "---\nname: growth-log\ndescription: old\n---\nold")
  put(".claude/skills/using-dev/SKILL.md", "---\nname: using-dev\ndescription: old\n---\nold")
  put(".claude/skills/learned/keep.md", "system")
  put(".claude/agents/java-reviewer.md", "---\nname: java-reviewer\ndescription: user\n---\nuser")
  put(".claude/agents/my-own.md", "---\nname: my-own\ndescription: mine\n---\nmine")
  put(".claude/commands/plan.md", "old plan")
  put(".claude/settings.json", JSON.stringify({ env: { ECC_MAX_INJECTED_INSTINCTS: "30" }, hooks: {
    PreToolUse: [{ matcher: "Bash|Edit|Write|MultiEdit|NotebookEdit", hooks: [{ type: "command", command: "~/.claude/skills/continuous-learning-v2/hooks/observe.sh pre" }] }],
    Stop: [{ matcher: "*", hooks: [{ type: "command", command: "python3 ~/.claude/scripts/quality-gate.py" }] }] } }, null, 2))
  put(".config/opencode/opencode.jsonc", JSON.stringify({ plugin: ["superpowers@git+https://github.com/obra/superpowers.git"] }, null, 2))
  put(".config/opencode/skills/search-first/SKILL.md", "old")
  put(".config/opencode/agent/java-reviewer.md", "old")
  put(".config/opencode/command/plan.md", "old")
  put(".agents/skills/unified-memory/SKILL.md", "old")
  put(".codex/agents/java-reviewer.toml", 'name = "java-reviewer"\n')
  const before = snapshot()

  run("install", "--harness", "all")
  assert.ok(!exists(".claude/skills/growth-log") && exists(".claude/_disabled/2026-09-25/skills/growth-log/SKILL.md"))
  assert.ok(!exists(".claude/skills/using-dev"))
  assert.ok(exists(".claude/skills/learned/keep.md"), "system skills stay")
  assert.ok(fs.readFileSync(path.join(home, ".claude/agents/java-reviewer.md"), "utf8").includes("managed-by: frankenbrain-lite"))
  assert.ok(exists(".claude/agents/my-own.md"), "user agents outside the list stay")
  assert.equal(fs.readdirSync(path.join(home, ".claude/agents")).filter((f) => fs.readFileSync(path.join(home, ".claude/agents", f), "utf8").includes("managed-by")).length, 12)
  const settings = JSON.parse(fs.readFileSync(path.join(home, ".claude/settings.json"), "utf8"))
  assert.equal(settings.hooks.PreToolUse, undefined, "observe hooks move to the plugin")
  assert.equal(settings.hooks.Stop.length, 1, "other hooks stay")
  assert.equal(settings.env.ECC_MAX_INJECTED_INSTINCTS, "12")
  const oc = JSON.parse(fs.readFileSync(path.join(home, ".config/opencode/opencode.jsonc"), "utf8"))
  assert.equal(oc.plugin.length, 2)
  assert.ok(oc.plugin[1].startsWith("file://") && oc.plugin[1].endsWith("/.opencode/plugins/frankenbrain.js"))
  assert.ok(!exists(".config/opencode/agent/java-reviewer.md") && !exists(".config/opencode/command/plan.md"))
  assert.ok(!exists(".agents/skills/unified-memory"))
  assert.equal(fs.readdirSync(path.join(home, ".codex/agents")).length, 27)
  assert.equal(fs.readlinkSync(path.join(home, ".local/bin/fbl")), path.join(root, "bin/fbl"))

  run("install", "--harness", "all")
  assert.match(run("verify", "--harness", "all"), /VERIFY PASS/)

  run("uninstall", "--harness", "all")
  assert.deepEqual(snapshot(), before, "uninstall must restore the exact previous state")
} finally {
  fs.rmSync(home, { recursive: true, force: true })
}
console.log("INSTALL TEST PASS")
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node test/test-install.mjs`
Expected: FAIL, `scripts/fbl-install.mjs` not found.

- [ ] **Step 3: Implement `scripts/install/common.mjs`**

```js
// scripts/install/common.mjs
// Shared installer state: reversible moves, backups, managed writes and CLI calls.
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

export function createContext({ home, root, date, skipCli }) {
  const stateFile = path.join(home, ".local", "share", "frankenbrain", "install-state.json")
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : { moves: [], created: [], edits: [] }
  return { home, root, date, skipCli, stateFile, state }
}

export function saveState(ctx) {
  fs.mkdirSync(path.dirname(ctx.stateFile), { recursive: true })
  fs.writeFileSync(ctx.stateFile, `${JSON.stringify(ctx.state, null, 2)}\n`)
}

export function disabledPath(ctx, harnessRoot, relative) {
  return path.join(harnessRoot, "_disabled", ctx.date, relative)
}

export function moveToDisabled(ctx, from, harnessRoot, relative) {
  if (!fs.existsSync(from)) return false
  const to = disabledPath(ctx, harnessRoot, relative)
  if (fs.existsSync(to)) throw new Error(`refusing to overwrite ${to}`)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.renameSync(from, to)
  ctx.state.moves.push({ from, to })
  return true
}

export function writeManaged(ctx, file, content) {
  const existed = fs.existsSync(file)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
  if (!existed && !ctx.state.created.includes(file)) ctx.state.created.push(file)
}

export function editWithBackup(ctx, file, transform) {
  if (!fs.existsSync(file)) return
  const original = fs.readFileSync(file, "utf8")
  const updated = transform(original)
  if (updated === original) return
  if (!ctx.state.edits.some((e) => e.file === file)) {
    const backup = `${file}.fbl-backup-${ctx.date}`
    fs.writeFileSync(backup, original)
    ctx.state.edits.push({ file, backup })
  }
  fs.writeFileSync(file, updated)
}

export function linkHelper(ctx) {
  const link = path.join(ctx.home, ".local", "bin", "fbl")
  const target = path.join(ctx.root, "bin", "fbl")
  if (fs.existsSync(link) && fs.readlinkSync(link) === target) return
  if (fs.existsSync(link)) moveToDisabled(ctx, link, path.join(ctx.home, ".local", "bin"), "fbl")
  fs.mkdirSync(path.dirname(link), { recursive: true })
  fs.symlinkSync(target, link)
  if (!ctx.state.created.includes(link)) ctx.state.created.push(link)
}

export function runCli(ctx, command, args) {
  if (ctx.skipCli) return ""
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180000 })
}

export function restoreAll(ctx) {
  for (const file of [...ctx.state.created].reverse()) fs.rmSync(file, { force: true, recursive: true })
  for (const { from, to } of [...ctx.state.moves].reverse()) {
    if (!fs.existsSync(to)) continue
    fs.mkdirSync(path.dirname(from), { recursive: true })
    fs.renameSync(to, from)
  }
  for (const { file, backup } of ctx.state.edits) {
    fs.writeFileSync(file, fs.readFileSync(backup, "utf8"))
    fs.rmSync(backup)
  }
  pruneEmptyDisabled(ctx)
  fs.rmSync(ctx.stateFile, { force: true })
  pruneEmpty(path.dirname(ctx.stateFile), ctx.home)
}

function pruneEmpty(dir, stop) {
  while (dir.startsWith(stop) && dir !== stop && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir)
    dir = path.dirname(dir)
  }
}

function pruneEmptyDisabled(ctx) {
  for (const { to } of ctx.state.moves) pruneEmpty(path.dirname(to), ctx.home)
}
```

- [ ] **Step 4: Implement `scripts/install/claude.mjs`**

```js
// scripts/install/claude.mjs
import fs from "node:fs"
import path from "node:path"
import { loadAgents, readNameList, toClaudeMarkdown } from "../../lib/agents.mjs"
import { loadCommands } from "../../lib/commands.mjs"
import { editWithBackup, moveToDisabled, runCli, writeManaged } from "./common.mjs"

const OBSERVE = "continuous-learning-v2/hooks/observe.sh"

function skillNames(root) {
  return fs.readdirSync(path.join(root, "skills"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
}

function stripObserveHooks(text) {
  const settings = JSON.parse(text)
  for (const event of ["PreToolUse", "PostToolUse"]) {
    const kept = (settings.hooks?.[event] ?? []).filter((m) => !m.hooks.some((h) => String(h.command).includes(OBSERVE)))
    if (settings.hooks && event in settings.hooks) kept.length ? (settings.hooks[event] = kept) : delete settings.hooks[event]
  }
  settings.env = { ...(settings.env ?? {}), ECC_MAX_INJECTED_INSTINCTS: "12" }
  return `${JSON.stringify(settings, null, 2)}\n`
}

export function installClaude(ctx) {
  const base = path.join(ctx.home, ".claude")
  runCli(ctx, "claude", ["plugin", "marketplace", "add", ctx.root, "--scope", "user"])
  runCli(ctx, "claude", ["plugin", "install", "frankenbrain-lite@frankenbrain-lite", "--scope", "user"])
  for (const name of [...skillNames(ctx.root), ...readNameList(ctx.root, "retired.txt")]) {
    moveToDisabled(ctx, path.join(base, "skills", name), base, path.join("skills", name))
  }
  for (const command of loadCommands(ctx.root)) {
    moveToDisabled(ctx, path.join(base, "commands", `${command.name}.md`), base, path.join("commands", `${command.name}.md`))
  }
  const wanted = new Set(readNameList(ctx.root, "claude-agents.txt"))
  for (const agent of loadAgents(ctx.root).filter((a) => wanted.has(a.name))) {
    const file = path.join(base, "agents", `${agent.name}.md`)
    if (fs.existsSync(file) && !fs.readFileSync(file, "utf8").includes("managed-by: frankenbrain-lite")) {
      moveToDisabled(ctx, file, base, path.join("agents", `${agent.name}.md`))
    }
    writeManaged(ctx, file, toClaudeMarkdown(agent))
  }
  editWithBackup(ctx, path.join(base, "settings.json"), stripObserveHooks)
}

export function updateClaude(ctx) {
  runCli(ctx, "claude", ["plugin", "marketplace", "update", "frankenbrain-lite"])
  runCli(ctx, "claude", ["plugin", "update", "frankenbrain-lite@frankenbrain-lite"])
  installClaude(ctx)
}

export function uninstallClaude(ctx) {
  runCli(ctx, "claude", ["plugin", "uninstall", "frankenbrain-lite@frankenbrain-lite", "--scope", "user"])
  runCli(ctx, "claude", ["plugin", "marketplace", "remove", "frankenbrain-lite"])
}
```

Note: `writeManaged` for an agent file that existed before (moved to `_disabled` first) records it as created, so uninstall removes the generated file and then restores the original from `_disabled`.

- [ ] **Step 5: Implement `scripts/install/opencode.mjs`**

```js
// scripts/install/opencode.mjs
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { loadAgents } from "../../lib/agents.mjs"
import { loadCommands } from "../../lib/commands.mjs"
import { editWithBackup, moveToDisabled } from "./common.mjs"

export function pluginUrl(root) {
  return pathToFileURL(path.join(root, ".opencode", "plugins", "frankenbrain.js")).href
}

function addPlugin(url) {
  return (text) => {
    const config = JSON.parse(text.replace(/^\s*\/\/.*$/gm, ""))
    config.plugin ??= []
    if (!config.plugin.includes(url)) config.plugin.push(url)
    return `${JSON.stringify(config, null, 2)}\n`
  }
}

export function installOpenCode(ctx) {
  const base = path.join(ctx.home, ".config", "opencode")
  const agentsBase = path.join(ctx.home, ".agents")
  const configFile = ["opencode.jsonc", "opencode.json"].map((f) => path.join(base, f)).find((f) => fs.existsSync(f))
  if (!configFile) throw new Error(`OpenCode config not found under ${base}`)
  editWithBackup(ctx, configFile, addPlugin(pluginUrl(ctx.root)))
  const skills = fs.readdirSync(path.join(ctx.root, "skills"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  for (const name of skills) {
    moveToDisabled(ctx, path.join(base, "skills", name), base, path.join("skills", name))
    moveToDisabled(ctx, path.join(agentsBase, "skills", name), agentsBase, path.join("skills", name))
  }
  for (const agent of loadAgents(ctx.root)) {
    moveToDisabled(ctx, path.join(base, "agent", `${agent.name}.md`), base, path.join("agent", `${agent.name}.md`))
  }
  for (const command of loadCommands(ctx.root)) {
    moveToDisabled(ctx, path.join(base, "command", `${command.name}.md`), base, path.join("command", `${command.name}.md`))
  }
}
```

- [ ] **Step 6: Implement `scripts/install/codex.mjs`**

```js
// scripts/install/codex.mjs
import fs from "node:fs"
import path from "node:path"
import { loadAgents, toCodexToml, MANAGED_MARKER } from "../../lib/agents.mjs"
import { moveToDisabled, runCli, writeManaged } from "./common.mjs"

export function installCodex(ctx) {
  const base = path.join(ctx.home, ".codex")
  runCli(ctx, "codex", ["plugin", "marketplace", "add", ctx.root])
  runCli(ctx, "codex", ["plugin", "add", "frankenbrain-lite@frankenbrain-lite"])
  const overrides = JSON.parse(fs.readFileSync(path.join(ctx.root, "harness", "codex-agent-overrides.json"), "utf8"))
  for (const agent of loadAgents(ctx.root)) {
    const file = path.join(base, "agents", `${agent.name}.toml`)
    if (fs.existsSync(file) && !fs.readFileSync(file, "utf8").includes(MANAGED_MARKER)) {
      moveToDisabled(ctx, file, base, path.join("agents", `${agent.name}.toml`))
    }
    writeManaged(ctx, file, toCodexToml(agent, overrides))
  }
  const skills = fs.readdirSync(path.join(ctx.root, "skills"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  for (const name of skills) moveToDisabled(ctx, path.join(base, "skills", name), base, path.join("skills", name))
}

export function updateCodex(ctx) {
  installCodex(ctx)
}

export function uninstallCodex(ctx) {
  runCli(ctx, "codex", ["plugin", "remove", "frankenbrain-lite@frankenbrain-lite"])
  runCli(ctx, "codex", ["plugin", "marketplace", "remove", "frankenbrain-lite"])
}
```

- [ ] **Step 7: Implement `scripts/install/verify.mjs`**

```js
// scripts/install/verify.mjs
import fs from "node:fs"
import path from "node:path"
import { MANAGED_MARKER, readNameList } from "../../lib/agents.mjs"
import { pluginUrl } from "./opencode.mjs"
import { runCli } from "./common.mjs"

const countManaged = (dir, ext) => fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => f.endsWith(ext) && fs.readFileSync(path.join(dir, f), "utf8").includes(MANAGED_MARKER)).length : 0

function looseDuplicates(ctx, dirs) {
  const names = fs.readdirSync(path.join(ctx.root, "skills"))
  return dirs.flatMap((dir) => names.filter((n) => fs.existsSync(path.join(ctx.home, dir, n))).map((n) => `${dir}/${n}`))
}

export function verify(ctx, harnesses) {
  const problems = []
  const expectAgents = { claude: readNameList(ctx.root, "claude-agents.txt").length, codex: fs.readdirSync(path.join(ctx.root, "agents")).length }
  if (harnesses.includes("claude")) {
    const n = countManaged(path.join(ctx.home, ".claude", "agents"), ".md")
    if (n !== expectAgents.claude) problems.push(`claude agents ${n}/${expectAgents.claude}`)
    problems.push(...looseDuplicates(ctx, [".claude/skills"]).map((d) => `loose copy ${d}`))
    if (!ctx.skipCli && !runCli(ctx, "claude", ["plugin", "list"]).includes("frankenbrain-lite")) problems.push("claude plugin missing")
  }
  if (harnesses.includes("opencode")) {
    const file = ["opencode.jsonc", "opencode.json"].map((f) => path.join(ctx.home, ".config", "opencode", f)).find((f) => fs.existsSync(f))
    if (!file || !fs.readFileSync(file, "utf8").includes(pluginUrl(ctx.root))) problems.push("opencode plugin not registered")
    problems.push(...looseDuplicates(ctx, [".config/opencode/skills", ".agents/skills"]).map((d) => `loose copy ${d}`))
  }
  if (harnesses.includes("codex")) {
    const n = countManaged(path.join(ctx.home, ".codex", "agents"), ".toml")
    if (n !== expectAgents.codex) problems.push(`codex agents ${n}/${expectAgents.codex}`)
    if (!ctx.skipCli && !runCli(ctx, "codex", ["plugin", "list"]).includes("frankenbrain-lite")) problems.push("codex plugin missing")
  }
  const link = path.join(ctx.home, ".local", "bin", "fbl")
  if (!fs.existsSync(link) || fs.readlinkSync(link) !== path.join(ctx.root, "bin", "fbl")) problems.push("fbl helper not linked")
  return problems
}
```

- [ ] **Step 8: Implement the CLI entry**

```js
// scripts/fbl-install.mjs
// Usage: node scripts/fbl-install.mjs <install|update|uninstall|verify> [--harness claude|opencode|codex|all]
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createContext, linkHelper, restoreAll, saveState } from "./install/common.mjs"
import { installClaude, uninstallClaude, updateClaude } from "./install/claude.mjs"
import { installOpenCode } from "./install/opencode.mjs"
import { installCodex, uninstallCodex, updateCodex } from "./install/codex.mjs"
import { verify } from "./install/verify.mjs"

const ORDER = ["opencode", "claude", "codex"]
const INSTALL = { claude: installClaude, opencode: installOpenCode, codex: installCodex }
const UPDATE = { claude: updateClaude, opencode: installOpenCode, codex: updateCodex }
const UNINSTALL = { claude: uninstallClaude, opencode: () => {}, codex: uninstallCodex }

function parseArgs(argv) {
  const action = argv[0]
  const flag = argv.indexOf("--harness")
  const harness = flag >= 0 ? argv[flag + 1] : "all"
  const harnesses = harness === "all" ? ORDER : [harness]
  if (!["install", "update", "uninstall", "verify"].includes(action) || harnesses.some((h) => !ORDER.includes(h))) {
    throw new Error("usage: fbl-install.mjs <install|update|uninstall|verify> [--harness claude|opencode|codex|all]")
  }
  return { action, harnesses }
}

function main() {
  const { action, harnesses } = parseArgs(process.argv.slice(2))
  const ctx = createContext({
    home: process.env.FBL_HOME ?? os.homedir(),
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
    date: process.env.FBL_DATE ?? new Date().toISOString().slice(0, 10),
    skipCli: process.env.FBL_SKIP_CLI === "1",
  })
  if (action === "verify") {
    const problems = verify(ctx, harnesses)
    for (const p of problems) console.log(`VERIFY FAIL: ${p}`)
    console.log(problems.length ? "VERIFY FAILED" : "VERIFY PASS")
    process.exit(problems.length ? 1 : 0)
  }
  if (action === "uninstall") {
    for (const h of harnesses) UNINSTALL[h](ctx)
    restoreAll(ctx)
    console.log("UNINSTALL DONE")
    return
  }
  const steps = action === "install" ? INSTALL : UPDATE
  try {
    for (const h of harnesses) steps[h](ctx)
    linkHelper(ctx)
  } finally {
    saveState(ctx)
  }
  console.log(`${action.toUpperCase()} DONE: ${harnesses.join(", ")}`)
}

try {
  main()
} catch (error) {
  console.error(`fbl-install: ${error.message}`)
  process.exit(1)
}
```

- [ ] **Step 9: Run the test and confirm it passes**

Run: `node test/test-install.mjs`
Expected: `INSTALL TEST PASS`. If the snapshot comparison fails, the diff shows which path was not restored; fix the corresponding install step so it records the change in `ctx.state`.

- [ ] **Step 10: Add Makefile targets and the test, run `make check`, commit**

Add to `Makefile` (and to `.PHONY`):
```make
install:
	node scripts/fbl-install.mjs install --harness $(or $(HARNESS),all)

update:
	node scripts/fbl-install.mjs update --harness $(or $(HARNESS),all)

uninstall:
	node scripts/fbl-install.mjs uninstall --harness $(or $(HARNESS),all)

verify-install:
	node scripts/fbl-install.mjs verify --harness $(or $(HARNESS),all)
```
Add `	node test/test-install.mjs` under `test:`.
```bash
make check
git add scripts/fbl-install.mjs scripts/install test/test-install.mjs Makefile
git commit -m "feat(install): reversible installer for Claude, OpenCode and Codex with verification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 13: Retire harvest, update documentation

**Files:**
- Delete: `scripts/harvest.sh`
- Modify: `Makefile` (remove `harvest`), `README.md`, `AGENTS.md`, `GEMINI.md`, `skills/README.md`, `docs/superpowers/specs/2026-09-25-frankenbrain-global-plugin-design.md` (append "Spec addenda decided while planning" from this plan), `test/test-workflow-integration.sh`

- [ ] **Step 1: Write the failing documentation assertions**

In `test/test-workflow-integration.sh` add:
```bash
assert_not_exists scripts/harvest.sh
assert_contains README.md 'make install'
assert_contains README.md 'make verify-install'
assert_contains README.md 'agents-27'
assert_contains README.md '| [`skills/`](skills) | 32 |'
if grep -q '^harvest:' Makefile; then fail "Makefile still has a harvest target"; fi
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bash test/test-workflow-integration.sh`
Expected: FAIL `forbidden path exists: scripts/harvest.sh`.

- [ ] **Step 3: Retire harvest**

```bash
git rm scripts/harvest.sh
```
Remove the `harvest:` target and its `.PHONY` entry from `Makefile`.

- [ ] **Step 4: Update README**

- Badges: `skills-32`, `agents-27`.
- "What's inside" table: skills `32`, agents `27`, commands = `ls commands | wc -l`, scripts row lists `fbl-install · security-gate · validate · reconcile-report · install-hooks`.
- Skills-by-family table: remove the five workflow skills and add a line "Workflow skills come from the Superpowers plugin."
- Replace the Install table with:
```markdown
| Harness | Install |
|---------|---------|
| **All** | `make install` (or `make install HARNESS=claude|opencode|codex`), then open a new session. `make verify-install` checks the result; `make uninstall` restores the previous state. |
| **After editing the repo** | `make update`, then open a new session. |
| **Kiro** | Open the repo as a workspace; `.kiro/steering/` loads the brain. |
```

- [ ] **Step 5: Update the other context files**

- `AGENTS.md` / `GEMINI.md`: reference `rules/common/frankenbrain-workflow.md` and mention `make install`.
- `skills/README.md`: remove the "Updating" loop (lines that copy from `~/projects/ECC`) and replace with "Edit skills in this repository and run `make update`."
- Append the plan's "Spec addenda decided while planning" section to the spec.

- [ ] **Step 6: Run and commit**

Run: `make check`
Expected: exit 0.
```bash
git add -A Makefile scripts README.md AGENTS.md GEMINI.md skills/README.md docs/superpowers/specs test/test-workflow-integration.sh
git commit -m "docs: document make install/update/verify and retire harvest.sh

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase 5 — Live migration (each task ends with a user-visible check)

Before Task 14: `git status` must be clean and `make check` must pass on the branch.

### Task 14: Migrate OpenCode

- [ ] **Step 1: Install**

Run: `make install HARNESS=opencode`
Expected: `INSTALL DONE: opencode`.

- [ ] **Step 2: Verify**

Run: `make verify-install HARNESS=opencode`
Expected: `VERIFY PASS`.

- [ ] **Step 3: Live check from a foreign directory**

Run: `cd /tmp && opencode agent list | grep -c '(subagent)'; opencode debug skill | grep -c '"location": ".*FrankenBrain-Lite/skills/'`
Expected: subagent count ≥ 29 (27 FBL + built-ins); skill count 32.

- [ ] **Step 4: Rollback if needed**

If anything fails: `make uninstall HARNESS=opencode` and report the output; do not continue to Task 15.

### Task 15: Migrate Claude Code

- [ ] **Step 1: Install**

Run: `make install HARNESS=claude`
Expected: `INSTALL DONE: claude`; `claude plugin list` shows `frankenbrain-lite@frankenbrain-lite` enabled.

- [ ] **Step 2: Verify both Claude and OpenCode (OpenCode reads `~/.claude/skills`)**

Run: `make verify-install HARNESS=claude && make verify-install HARNESS=opencode`
Expected: two `VERIFY PASS`.

- [ ] **Step 3: Inventory and cost**

Run: `claude plugin details frankenbrain-lite | sed -n '1,12p'`
Expected: `Skills (N)` with N = 32 + commands count; `Agents (0)`; record the `Always-on` token figure.

- [ ] **Step 4: Fix references to moved paths in user config**

Run: `grep -n "\.claude/skills/" ~/.claude/CLAUDE.md ~/.claude/settings.json ~/.config/opencode/AGENTS.md ~/.config/opencode/opencode.jsonc 2>/dev/null`
Expected: only references to skills that still exist; for each dangling reference (e.g. `~/.claude/skills/graphify/SKILL.md` in `~/.claude/CLAUDE.md`), replace it with the skill name (`graphify` skill) after showing the user the exact line.

- [ ] **Step 5: USER CHECK — new session**

Ask the user to open a new Claude Code session in a directory outside FrankenBrain-Lite and confirm: the context starts with `<frankenbrain-lite-bootstrap>` and `- Harness: claude`; `/agents` lists the 12 agents; no "SessionStart truncated" notice.

### Task 16: Migrate Codex

- [ ] **Step 1: Install**

Run: `make install HARNESS=codex`
Expected: `INSTALL DONE: codex`; `codex plugin list` includes `frankenbrain-lite`.

- [ ] **Step 2: Verify**

Run: `make verify-install HARNESS=codex && ls ~/.codex/agents/*.toml | wc -l && python3 -c "import tomllib,glob;[tomllib.load(open(f,'rb'))['name'] for f in glob.glob('$HOME/.codex/agents/*.toml')];print('toml ok')"`
Expected: `VERIFY PASS`, `27`, `toml ok`.

- [ ] **Step 3: USER CHECK — new session**

Ask the user to open a new Codex session outside FrankenBrain-Lite, trust the FrankenBrain-Lite hooks in `/hooks`, run one shell command, and report: no `Ignoring malformed agent role definition` warning; bootstrap shows `- Harness: codex` and a `## Learned instincts` section. Then run:
`tail -3 ~/.local/share/ecc-homunculus/observations.jsonl | grep -c '"harness": "codex"'`
Expected: ≥ 1. If 0, Codex did not fire `PostToolUse`: switch the capture hook in `hooks/codex-hooks.json` to the `Stop` event (spec §11 fallback), `make update HARNESS=codex`, and repeat this step.

### Task 17: Turn on the observer and record the outcome

- [x] **Step 1: Enable**

Set `"enabled": true` in `skills/continuous-learning-v2/config.json`; run `make check`; commit `feat(learning): enable observer in all harnesses`; run `make update`.

- [x] **Step 2: Confirm analyzers start with the right model**

After one working session per harness, run:
`grep -h -E "Analyzing|CLI not found|timed out" ~/.local/share/ecc-homunculus/observer.log ~/.local/share/ecc-homunculus/projects/*/observer.log 2>/dev/null | tail -5; ps -eo args | grep -E "observer-loop|--model haiku|gpt-5.6-luna" | grep -v grep`
Expected: at least one `Analyzing N observations` line and no `CLI not found`.

- [x] **Step 3: Check `self-healer` does not fight the plugin**

Run: `grep -n "skill-revived" ~/.local/log/healing/healing.jsonl | tail -3`
Expected: `nothing to repair` after migration (plugin skills are not copies in skill directories).

- [ ] **Step 4: Measure and record**

Record in the vault handoff `frankenbrain-lite--superpowers-workflow.md`: Claude `Always-on` tokens from Task 15, observer runs per day, and whether Codex captures. Run `handoffs-index` and `graphify update .`.

---

## Self-review notes

- Spec coverage: §1 criteria 1–7 → Tasks 14–17 (1, 2, 5), Task 12 verify (3, 6), Task 12 uninstall (7), Task 13 update docs (4). §2 D1 → Task 12; D3 → Tasks 4, 12; D4/D7 → Task 7; D5 → Tasks 6–7; D6 → Task 6; D8 → Tasks 9, 10, 17; D9 → Task 13. §7 capture → Task 9; analyzer → Task 10; Codex instincts → Task 6. §8 errors → Tasks 6, 8 (try/catch), 10 (CLI missing). §10 tests → Tasks 1, 4–12.
- Names used across tasks: `parseFrontmatter`, `loadAgents`, `toClaudeMarkdown`, `toCodexToml`, `toOpenCodeAgent`, `readNameList`, `MANAGED_MARKER`, `loadCommands`, `toOpenCodeCommand`, `loadInstincts`, `selectInstincts`, `resolveHomunculusDir`, `detectHarness`, `resolveVaultStatus`, `buildBootstrap`, `MAX_BOOTSTRAP_CHARS`, `pluginUrl`, `createContext`, `moveToDisabled`, `writeManaged`, `editWithBackup`, `linkHelper`, `runCli`, `restoreAll`, `saveState`, `verify`.
