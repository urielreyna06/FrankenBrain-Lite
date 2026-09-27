// test/test-frontmatter.mjs
import assert from "node:assert/strict"
import { parseFrontmatter } from "../lib/frontmatter.mjs"

const parsed = parseFrontmatter([
  "---",
  "description: Reviews code: fast and safe",
  "mode: subagent",
  "confidence: 0.85",
  "tools:",
  "  read: true",
  "  write: false",
  "---",
  "",
  "Body line",
].join("\n"))
assert.equal(parsed.data.description, "Reviews code: fast and safe")
assert.equal(parsed.data.mode, "subagent")
assert.equal(parsed.data.confidence, 0.85)
assert.deepEqual(parsed.data.tools, { read: true, write: false })
assert.equal(parsed.body.trim(), "Body line")

const noFrontmatter = parseFrontmatter("just text")
assert.deepEqual(noFrontmatter.data, {})
assert.equal(noFrontmatter.body, "just text")

const quoted = parseFrontmatter("---\nname: 'x'\ndescription: \"y\"\n---\nz")
assert.equal(quoted.data.name, "x")
assert.equal(quoted.data.description, "y")

const folded = parseFrontmatter("---\nname: bp\ndescription: >-\n  Line one of\n  the description.\nmode: x\n---\nbody")
assert.equal(folded.data.description, "Line one of the description.")
assert.equal(folded.data.mode, "x")

const literal = parseFrontmatter("---\nnote: |\n  a\n  b\n---\nbody")
assert.equal(literal.data.note, "a\nb")

const nestedList = parseFrontmatter("---\nmetadata:\n  version: 1.0.0\n  requires:\n    - aws\n    - jq\n---\nbody")
assert.deepEqual(nestedList.data.metadata, { version: "1.0.0", requires: ["aws", "jq"] })

assert.throws(() => parseFrontmatter("---\n- list item\n---\nbody"), /unsupported frontmatter line/)
console.log("FRONTMATTER TEST PASS")
