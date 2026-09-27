import assert from "node:assert/strict"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { FrankenBrainPlugin } from "../.opencode/plugins/frankenbrain.js"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const plugin = await FrankenBrainPlugin({ directory: packageRoot })

const config = { agent: { "java-reviewer": { description: "user override" } } }
await plugin.config(config)
await plugin.config(config)
assert.deepEqual(config.skills.paths, [path.join(packageRoot, "skills")])
assert.equal(Object.keys(config.agent).length, 27)
assert.equal(config.agent["java-reviewer"].description, "user override", "existing config must win")
assert.equal(config.agent["self-healer"].mode, "subagent")
assert.ok(config.command.plan.template.length > 50)

const output = { messages: [{ info: { role: "user" }, parts: [{ type: "text", text: "hello" }] }] }
await plugin["experimental.chat.messages.transform"]({}, output)
await plugin["experimental.chat.messages.transform"]({}, output)
const injected = output.messages[0].parts.filter((p) => p.type === "text" && p.text.includes("FrankenBrain workflow"))
assert.equal(injected.length, 1)
assert.ok(injected[0].text.includes("- Harness: opencode"))
assert.equal(output.messages[0].parts.at(-1).text, "hello")
console.log("OPENCODE PLUGIN TEST PASS")
