// scripts/install/opencode.mjs
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { loadAgents, readNameList } from "../../lib/agents.mjs"
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
  const skills = [
    ...fs.readdirSync(path.join(ctx.root, "skills"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name),
    ...readNameList(ctx.root, "retired.txt"),
  ]
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
