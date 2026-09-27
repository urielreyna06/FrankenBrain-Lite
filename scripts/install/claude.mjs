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
