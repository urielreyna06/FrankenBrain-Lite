// test/test-install.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const home = fs.mkdtempSync(path.join(os.tmpdir(), "fbl-install-"))
const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(home, rel)), { recursive: true }); fs.writeFileSync(path.join(home, rel), text) }
const exists = (rel) => fs.existsSync(path.join(home, rel))
const run = (...args) => execFileSync("node", [path.join(root, "scripts/fbl-install.mjs"), ...args],
  { env: { ...process.env, FBL_HOME: home, FBL_SKIP_CLI: "1", FBL_DATE: "2026-09-25" }, encoding: "utf8" })

function snapshot() {
  const out = {}
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name); if (e.isDirectory()) walk(full); else out[path.relative(home, full)] = fs.readFileSync(full, "utf8") } }
  walk(home)
  return out
}

try {
  put(".claude/skills/growth-log/SKILL.md", "---\nname: growth-log\ndescription: old\n---\nold")
  put(".claude/skills/using-dev/SKILL.md", "---\nname: using-dev\ndescription: old\n---\nold")
  put(".claude/skills/learned/keep.md", "system")
  put(".claude/agents/java-reviewer.md", "---\nname: java-reviewer\ndescription: user\n---\nuser")
  put(".claude/agents/my-own.md", "---\nname: my-own\ndescription: mine\n---\nmine")
  put(".claude/commands/plan.md", "old plan")
  put(".claude/settings.json", JSON.stringify({ env: { ECC_MAX_INJECTED_INSTINCTS: "30" }, hooks: {
    PreToolUse: [{ matcher: "Bash|Edit|Write|MultiEdit|NotebookEdit", hooks: [{ type: "command", command: "~/.claude/skills/continuous-learning-v2/hooks/observe.sh pre" }] }],
    Stop: [{ matcher: "*", hooks: [{ type: "command", command: "python3 ~/.claude/scripts/quality-gate.py" }] }] } }, null, 2))
  put(".config/opencode/opencode.jsonc", JSON.stringify({ plugin: ["superpowers@git+https://github.com/obra/superpowers.git"] }, null, 2))
  put(".config/opencode/skills/search-first/SKILL.md", "old")
  put(".config/opencode/skills/README.md", "not a skill")
  put(".config/opencode/skills/using-dev/SKILL.md", "old router")
  put(".config/opencode/agent/java-reviewer.md", "old")
  put(".config/opencode/command/plan.md", "old")
  put(".agents/skills/unified-memory/SKILL.md", "old")
  put(".codex/agents/java-reviewer.toml", 'name = "java-reviewer"\n')
  const before = snapshot()

  run("install", "--harness", "all")
  assert.ok(!exists(".claude/skills/growth-log") && exists(".claude/_disabled/2026-09-25/skills/growth-log/SKILL.md"))
  assert.ok(!exists(".claude/skills/using-dev"))
  assert.ok(exists(".claude/skills/learned/keep.md"), "system skills stay")
  assert.ok(fs.readFileSync(path.join(home, ".claude/agents/java-reviewer.md"), "utf8").includes("managed-by: frankenbrain-lite"))
  assert.ok(exists(".claude/agents/my-own.md"), "user agents outside the list stay")
  assert.equal(fs.readdirSync(path.join(home, ".claude/agents")).filter((f) => fs.readFileSync(path.join(home, ".claude/agents", f), "utf8").includes("managed-by")).length, 12)
  const settings = JSON.parse(fs.readFileSync(path.join(home, ".claude/settings.json"), "utf8"))
  assert.equal(settings.hooks.PreToolUse, undefined, "observe hooks move to the plugin")
  assert.equal(settings.hooks.Stop.length, 1, "other hooks stay")
  assert.equal(settings.env.ECC_MAX_INJECTED_INSTINCTS, "12")
  const oc = JSON.parse(fs.readFileSync(path.join(home, ".config/opencode/opencode.jsonc"), "utf8"))
  assert.equal(oc.plugin.length, 2)
  assert.ok(oc.plugin[1].startsWith("file://") && oc.plugin[1].endsWith("/.opencode/plugins/frankenbrain.js"))
  assert.ok(!exists(".config/opencode/agent/java-reviewer.md") && !exists(".config/opencode/command/plan.md"))
  assert.ok(!exists(".agents/skills/unified-memory"))
  assert.ok(!exists(".config/opencode/skills/using-dev"), "retired skills leave OpenCode too")
  assert.equal(fs.readdirSync(path.join(home, ".codex/agents")).length, 27)
  assert.equal(fs.readlinkSync(path.join(home, ".local/bin/fbl")), path.join(root, "bin/fbl"))

  run("install", "--harness", "all")
  assert.match(run("verify", "--harness", "all"), /VERIFY PASS/)

  run("uninstall", "--harness", "all")
  assert.deepEqual(snapshot(), before, "uninstall must restore the exact previous state")
} finally {
  fs.rmSync(home, { recursive: true, force: true })
}
console.log("INSTALL TEST PASS")
