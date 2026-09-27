// test/test-instincts.mjs
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { loadInstincts, selectInstincts, resolveHomunculusDir } from "../lib/instincts.mjs"

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fbl-instincts-"))
const write = (name, confidence, action) => fs.writeFileSync(path.join(dir, `${name}.md`),
  `---\nid: ${name}\ntrigger: when x\nconfidence: ${confidence}\n---\n\n# T\n\n## Action\n${action}\n\n## Evidence\n- e\n`)
try {
  write("aws-a", 0.85, "Always prepend `export AWS_PROFILE=ExampleProfile &&` and append `--region us-east-1` to AWS CLI commands that require authentication.")
  write("aws-b", 0.85, "Prepend `export AWS_PROFILE=ExampleProfile &&` to every AWS CLI command that requires authentication (aws lambda, aws dynamodb).")
  write("low", 0.4, "Should be filtered by confidence.")
  write("other", 0.9, "Quote buildName in browserstack.yml.")
  fs.writeFileSync(path.join(dir, "broken.md"), "---\n- bad\n---\n")

  const list = loadInstincts(dir)
  assert.equal(list.length, 3)
  const lines = selectInstincts(list, { maxChars: 2000 })
  assert.equal(lines.length, 2, "near-duplicate AWS instinct must be removed")
  assert.match(lines[0], /^- \[90%\] Quote buildName/)
  assert.deepEqual(selectInstincts(list, { maxChars: 10 }), [])
} finally {
  fs.rmSync(dir, { recursive: true, force: true })
}
assert.equal(resolveHomunculusDir({ CLV2_HOMUNCULUS_DIR: "/x/h" }, "/home/u"), "/x/h")
assert.equal(resolveHomunculusDir({ XDG_DATA_HOME: "/d" }, "/home/u"), "/d/ecc-homunculus")
assert.equal(resolveHomunculusDir({}, "/home/u"), "/home/u/.local/share/ecc-homunculus")
console.log("INSTINCTS TEST PASS")
