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
