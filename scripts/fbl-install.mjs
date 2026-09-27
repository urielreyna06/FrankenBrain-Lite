// scripts/fbl-install.mjs
// Usage: node scripts/fbl-install.mjs <install|update|uninstall|verify> [--harness claude|opencode|codex|all]
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createContext, linkHelper, restoreAll, saveState } from "./install/common.mjs"
import { installClaude, uninstallClaude, updateClaude } from "./install/claude.mjs"
import { installOpenCode } from "./install/opencode.mjs"
import { installCodex, uninstallCodex, updateCodex } from "./install/codex.mjs"
import { verify } from "./install/verify.mjs"

const ORDER = ["opencode", "claude", "codex"]
const INSTALL = { claude: installClaude, opencode: installOpenCode, codex: installCodex }
const UPDATE = { claude: updateClaude, opencode: installOpenCode, codex: updateCodex }
const UNINSTALL = { claude: uninstallClaude, opencode: () => {}, codex: uninstallCodex }

function parseArgs(argv) {
  const action = argv[0]
  const flag = argv.indexOf("--harness")
  const harness = flag >= 0 ? argv[flag + 1] : "all"
  const harnesses = harness === "all" ? ORDER : [harness]
  if (!["install", "update", "uninstall", "verify"].includes(action) || harnesses.some((h) => !ORDER.includes(h))) {
    throw new Error("usage: fbl-install.mjs <install|update|uninstall|verify> [--harness claude|opencode|codex|all]")
  }
  return { action, harnesses }
}

function main() {
  const { action, harnesses } = parseArgs(process.argv.slice(2))
  const ctx = createContext({
    home: process.env.FBL_HOME ?? os.homedir(),
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
    date: process.env.FBL_DATE ?? new Date().toISOString().slice(0, 10),
    skipCli: process.env.FBL_SKIP_CLI === "1",
  })
  if (action === "verify") {
    const problems = verify(ctx, harnesses)
    for (const p of problems) console.log(`VERIFY FAIL: ${p}`)
    console.log(problems.length ? "VERIFY FAILED" : "VERIFY PASS")
    process.exit(problems.length ? 1 : 0)
  }
  if (action === "uninstall") {
    for (const h of harnesses) UNINSTALL[h](ctx)
    restoreAll(ctx)
    console.log("UNINSTALL DONE")
    return
  }
  const steps = action === "install" ? INSTALL : UPDATE
  try {
    for (const h of harnesses) steps[h](ctx)
    linkHelper(ctx)
  } finally {
    saveState(ctx)
  }
  console.log(`${action.toUpperCase()} DONE: ${harnesses.join(", ")}`)
}

try {
  main()
} catch (error) {
  console.error(`fbl-install: ${error.message}`)
  process.exit(1)
}
