// test/test-bootstrap.mjs
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildBootstrap, detectHarness, resolveVaultStatus, MAX_BOOTSTRAP_CHARS } from "../lib/bootstrap.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const STEPS = ["brainstorming", "writing-plans", "test-driven-development", "systematic-debugging",
  "requesting-code-review", "verification-before-completion", "handoffs-index", "learn-eval"]

assert.equal(detectHarness({ FRANKENBRAIN_HARNESS: "opencode" }), "opencode")
assert.equal(detectHarness({ CLAUDE_PLUGIN_ROOT: "/p" }), "claude")
assert.equal(detectHarness({ PLUGIN_ROOT: "/p" }), "codex")
assert.equal(detectHarness({}), "unknown")

const missing = resolveVaultStatus({})
for (const harness of ["claude", "codex", "opencode", "unknown"]) {
  const text = buildBootstrap({ root, harness, vaultStatus: missing })
  for (const step of STEPS) assert.ok(text.includes(step), `${harness} bootstrap lacks ${step}`)
  assert.ok(text.includes(`- Harness: ${harness}`))
  assert.match(text, /shared memory unavailable/i)
  assert.ok(text.length <= MAX_BOOTSTRAP_CHARS, `${harness} bootstrap too long: ${text.length}`)
  assert.ok(!/\/home\/[a-z]/.test(text), "bootstrap must not contain a personal path")
}

const instincts = Array.from({ length: 200 }, (_, i) => ({ id: `i${i}`, confidence: 0.9, action: `Unique lesson number ${i} ${"word".repeat(i % 7)} alpha${i} beta${i} gamma${i}` }))
const codex = buildBootstrap({ root, harness: "codex", vaultStatus: missing, instincts })
assert.match(codex, /## Learned instincts/)
assert.ok(codex.length <= MAX_BOOTSTRAP_CHARS)
assert.ok(codex.trim().endsWith("</frankenbrain-lite-bootstrap>"))

const vault = fs.mkdtempSync(path.join(os.tmpdir(), "fbl-vault-"))
try {
  fs.mkdirSync(path.join(vault, "memory", "handoffs"), { recursive: true })
  fs.writeFileSync(path.join(vault, "AGENTS.md"), "PRIVATE-VAULT-CONTRACT-SENTINEL")
  fs.writeFileSync(path.join(vault, "memory", "handoffs", "CURRENT.md"), "PRIVATE-HANDOFF-SENTINEL")
  const available = buildBootstrap({ root, harness: "claude", vaultStatus: resolveVaultStatus({ FRANKENBRAIN_VAULT_ROOT: vault }) })
  assert.ok(available.includes(path.join(vault, "AGENTS.md")))
  assert.ok(!available.includes("PRIVATE-"))
} finally {
  fs.rmSync(vault, { recursive: true, force: true })
}
console.log("BOOTSTRAP TEST PASS")
