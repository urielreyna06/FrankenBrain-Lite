// scripts/install/verify.mjs
import fs from "node:fs"
import path from "node:path"
import { MANAGED_MARKER, readNameList } from "../../lib/agents.mjs"
import { pluginUrl } from "./opencode.mjs"
import { runCli } from "./common.mjs"

const countManaged = (dir, ext) => fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => f.endsWith(ext) && fs.readFileSync(path.join(dir, f), "utf8").includes(MANAGED_MARKER)).length : 0

function looseDuplicates(ctx, dirs) {
  const names = fs.readdirSync(path.join(ctx.root, "skills"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
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
