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
