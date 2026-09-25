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
