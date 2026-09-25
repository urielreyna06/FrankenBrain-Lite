import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Executable compatibility target: OpenCode 1.18.32 V1 plugin API.
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const workflowRulePath = path.join(packageRoot, "rules/common/superpowers-workflow.md")
const memoryRulePath = path.join(packageRoot, "rules/common/persistent-memory.md")
const publicWorkflowRule = fs.readFileSync(workflowRulePath, "utf8").trim()
const publicMemoryRule = fs.readFileSync(memoryRulePath, "utf8").trim()

export function resolveVaultStatus(env = process.env, fsApi = fs) {
  const rawRoot = env.FRANKENBRAIN_VAULT_ROOT
  const configuredRoot = typeof rawRoot === "string" ? rawRoot.trim() : ""
  if (!configuredRoot) {
    return {
      available: false,
      root: null,
      contractPath: null,
      handoffIndexPath: null,
      reason: "FRANKENBRAIN_VAULT_ROOT is not configured",
    }
  }

  const root = path.resolve(configuredRoot)
  const contractPath = path.join(root, "AGENTS.md")
  const handoffIndexPath = path.join(root, "memory", "handoffs", "CURRENT.md")
  const available = fsApi.existsSync(root)
    && fsApi.existsSync(contractPath)
    && fsApi.existsSync(handoffIndexPath)

  return {
    available,
    root,
    contractPath,
    handoffIndexPath,
    reason: available
      ? "shared vault contract and handoff index are available"
      : "configured shared vault is missing its contract or handoff index",
  }
}

export function buildBootstrap({ vaultStatus }) {
  const displayPath = (value) => JSON.stringify(value)
  const memoryStatus = vaultStatus.available
    ? [
        `Shared memory is available at ${displayPath(vaultStatus.root)}.`,
        `Read the public contract at ${displayPath(vaultStatus.contractPath)} and the handoff index at ${displayPath(vaultStatus.handoffIndexPath)} when relevant.`,
        "Do not inject or log note or memory bodies automatically.",
      ].join("\n")
    : `Shared memory unavailable: ${vaultStatus.reason}. Continue without inventing context or another store.`

  return [
    "<frankenbrain-lite-bootstrap>",
    publicWorkflowRule,
    "",
    publicMemoryRule,
    "",
    memoryStatus,
    "</frankenbrain-lite-bootstrap>",
  ].join("\n")
}

export const FrankenBrainPlugin = async () => {
  let bootstrapInjected = false

  return {
    config: async (config) => {
      config.skills ??= {}
      config.skills.paths ??= []
      const skillsPath = path.join(packageRoot, "skills")
      if (!config.skills.paths.includes(skillsPath)) {
        config.skills.paths.push(skillsPath)
      }
    },

    "experimental.chat.messages.transform": async (_input, output) => {
      if (bootstrapInjected || !Array.isArray(output.messages)) {
        return
      }

      const firstUserMessage = output.messages.find(
        (message) => message?.info?.role === "user" && Array.isArray(message.parts),
      )
      if (!firstUserMessage) {
        return
      }

      firstUserMessage.parts.unshift({
        type: "text",
        text: buildBootstrap({ vaultStatus: resolveVaultStatus(process.env) }),
      })
      bootstrapInjected = true
    },
  }
}

export default FrankenBrainPlugin
