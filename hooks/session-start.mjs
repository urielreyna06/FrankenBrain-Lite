#!/usr/bin/env node
// SessionStart entry for Claude Code and Codex. Never fails the session.
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildBootstrap, detectHarness, resolveVaultStatus } from "../lib/bootstrap.mjs"
import { loadInstincts, resolveHomunculusDir } from "../lib/instincts.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function emit(text) {
  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text } })}\n`)
}

try {
  const harness = detectHarness(process.env)
  const instinctDir = path.join(resolveHomunculusDir(process.env, os.homedir()), "instincts", "personal")
  const instincts = harness === "codex" ? loadInstincts(instinctDir) : []
  emit(buildBootstrap({ root, harness, vaultStatus: resolveVaultStatus(process.env), instincts }))
} catch (error) {
  process.stderr.write(`[frankenbrain-lite] bootstrap degraded: ${error.message}\n`)
  emit(`FrankenBrain-Lite bootstrap unavailable: ${error.message}`)
}
