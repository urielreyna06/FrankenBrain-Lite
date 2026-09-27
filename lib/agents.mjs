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
