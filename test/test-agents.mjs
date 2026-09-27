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
