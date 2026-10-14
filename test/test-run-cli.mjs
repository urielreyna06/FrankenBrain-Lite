// test/test-run-cli.mjs — runCli must not die on large CLI output
// (`codex plugin list` printed ~1.2 MB on codex 0.162, over the 1 MB default).
import assert from "node:assert/strict"
import { runCli } from "../scripts/install/common.mjs"

const TWO_MB = 2 * 1024 * 1024
const out = runCli({}, "node", ["-e", `process.stdout.write("x".repeat(${TWO_MB}))`])
assert.equal(out.length, TWO_MB, "runCli returns the full large output")
assert.equal(runCli({ skipCli: true }, "node", ["-e", "process.exit(1)"]), "", "skipCli short-circuits")
console.log("RUN CLI TEST PASS")
