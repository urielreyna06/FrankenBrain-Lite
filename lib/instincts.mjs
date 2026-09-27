// lib/instincts.mjs
// Loads ECC instincts and selects a deduplicated, budgeted list for the bootstrap.
import fs from "node:fs"
import path from "node:path"
import { parseFrontmatter } from "./frontmatter.mjs"

const OVERLAP_THRESHOLD = 0.7

export function resolveHomunculusDir(env, home) {
  if (env.CLV2_HOMUNCULUS_DIR?.startsWith("/")) return env.CLV2_HOMUNCULUS_DIR
  if (env.XDG_DATA_HOME?.startsWith("/")) return path.join(env.XDG_DATA_HOME, "ecc-homunculus")
  return path.join(home, ".local", "share", "ecc-homunculus")
}

function extractAction(body) {
  const match = /##\s*Action\s*\n+([\s\S]*?)(?=\n##\s|$)/.exec(body)
  const first = (match ? match[1] : "").trim().split(/\n\s*\n/)[0] ?? ""
  return first.replace(/\s+/g, " ").trim()
}

export function loadInstincts(dir, { minConfidence = 0.6 } = {}) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).flatMap((file) => {
    try {
      const { data, body } = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"))
      const confidence = Number(data.confidence)
      const action = extractAction(body)
      if (!(confidence >= minConfidence) || !action) return []
      return [{ id: String(data.id ?? file.slice(0, -3)), confidence, action }]
    } catch {
      return []
    }
  })
}

// Plural-insensitive so "command"/"commands" and "require"/"requires" count as shared words.
const stem = (word) => (word.length > 4 ? word.replace(/s$/, "") : word)
const words = (text) => new Set((text.toLowerCase().match(/[a-z0-9_=-]{3,}/g) ?? []).map(stem))

function isNearDuplicate(a, b) {
  let shared = 0
  for (const w of a) if (b.has(w)) shared++
  return shared / Math.max(1, Math.min(a.size, b.size)) >= OVERLAP_THRESHOLD
}

export function selectInstincts(list, { maxChars }) {
  const chosen = []
  const chosenWords = []
  let used = 0
  const ordered = [...list].sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))
  for (const item of ordered) {
    const itemWords = words(item.action)
    if (chosenWords.some((w) => isNearDuplicate(itemWords, w))) continue
    const line = `- [${Math.round(item.confidence * 100)}%] ${item.action}`
    if (used + line.length + 1 > maxChars) continue
    chosen.push(line)
    chosenWords.push(itemWords)
    used += line.length + 1
  }
  return chosen
}
