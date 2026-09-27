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
