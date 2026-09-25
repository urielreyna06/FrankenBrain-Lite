import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  FrankenBrainPlugin,
  buildBootstrap,
  resolveVaultStatus,
} from "../.opencode/plugins/frankenbrain.js"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const missing = resolveVaultStatus({})
assert.equal(missing.available, false)

const bootstrap = buildBootstrap({ vaultStatus: missing })
assert.match(bootstrap, /brainstorming/)
assert.match(bootstrap, /test-driven-development/)
assert.match(bootstrap, /shared memory unavailable/i)

const invalid = resolveVaultStatus({
  FRANKENBRAIN_VAULT_ROOT: path.join(os.tmpdir(), "fbl-vault-does-not-exist"),
})
assert.equal(invalid.available, false)
assert.match(buildBootstrap({ vaultStatus: invalid }), /shared memory unavailable/i)

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fbl-vault-"))
try {
  const memoryRoot = path.join(temporaryRoot, "memory")
  const handoffRoot = path.join(memoryRoot, "handoffs")
  fs.mkdirSync(handoffRoot, { recursive: true })
  fs.writeFileSync(path.join(temporaryRoot, "AGENTS.md"), "PRIVATE-VAULT-CONTRACT-SENTINEL")
  fs.writeFileSync(path.join(handoffRoot, "CURRENT.md"), "PRIVATE-HANDOFF-SENTINEL")

  const available = resolveVaultStatus({ FRANKENBRAIN_VAULT_ROOT: temporaryRoot })
  assert.equal(available.available, true)
  assert.equal(available.contractPath, path.join(temporaryRoot, "AGENTS.md"))
  assert.equal(available.handoffIndexPath, path.join(handoffRoot, "CURRENT.md"))

  const availableBootstrap = buildBootstrap({ vaultStatus: available })
  assert.match(availableBootstrap, new RegExp(temporaryRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.doesNotMatch(availableBootstrap, /PRIVATE-VAULT-CONTRACT-SENTINEL/)
  assert.doesNotMatch(availableBootstrap, /PRIVATE-HANDOFF-SENTINEL/)
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}

const plugin = await FrankenBrainPlugin({ directory: packageRoot })
const config = {}
await plugin.config(config)
await plugin.config(config)
assert.deepEqual(config.skills.paths, [path.join(packageRoot, "skills")])

const output = {
  messages: [
    {
      info: { role: "user" },
      parts: [{ type: "text", text: "hello" }],
    },
  ],
}

await plugin["experimental.chat.messages.transform"]({}, output)
await plugin["experimental.chat.messages.transform"]({}, output)

const injected = output.messages[0].parts.filter(
  (part) => part.type === "text" && part.text.includes("FrankenBrain workflow"),
)
assert.equal(injected.length, 1)
assert.equal(output.messages[0].parts.at(-1).text, "hello")

console.log("OPENCODE PLUGIN TEST PASS")
