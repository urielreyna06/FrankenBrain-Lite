// test/test-reconcile.mjs
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildReport } from "../scripts/reconcile-report.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const home = fs.mkdtempSync(path.join(os.tmpdir(), "fbl-reconcile-"))
try {
  const agentsDir = path.join(home, ".claude", "agents")
  fs.mkdirSync(agentsDir, { recursive: true })
  const canonical = fs.readFileSync(path.join(root, "agents", "architect.md"), "utf8")
  fs.writeFileSync(path.join(agentsDir, "architect.md"), `${canonical}\nUNIQUE-LIVE-LINE-123\n`)
  fs.writeFileSync(path.join(agentsDir, "zz-live-only.md"), "---\ndescription: x\n---\nonly here\n")

  const rows = buildReport({ root, home })
  const architect = rows.find((r) => r.category === "agents" && r.name === "architect")
  assert.equal(architect.status, "merge")
  assert.deepEqual(architect.lines, ["UNIQUE-LIVE-LINE-123"])
  const liveOnly = rows.find((r) => r.name === "zz-live-only")
  assert.equal(liveOnly.status, "absorb")
} finally {
  fs.rmSync(home, { recursive: true, force: true })
}
console.log("RECONCILE TEST PASS")
