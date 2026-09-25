// scripts/reconcile-report.mjs
// Compares canonical agents/skills/commands with live harness copies (body lines only).
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { parseFrontmatter } from "../lib/frontmatter.mjs"

const SOURCES = {
  agents: [["claude", ".claude/agents", "file"], ["opencode", ".config/opencode/agent", "file"]],
  commands: [["claude", ".claude/commands", "file"], ["opencode", ".config/opencode/command", "file"]],
  skills: [["claude", ".claude/skills", "dir"], ["opencode", ".config/opencode/skills", "dir"], ["agents", ".agents/skills", "dir"]],
}
const SYSTEM_SKILLS = new Set(["learned", "synced"])

function readList(root, file) {
  const full = path.join(root, "harness", file)
  if (!fs.existsSync(full)) return new Set()
  return new Set(fs.readFileSync(full, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")))
}

function listItems(base, kind) {
  const items = new Map()
  if (!fs.existsSync(base)) return items
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (kind === "file" && entry.isFile() && entry.name.endsWith(".md")) {
      items.set(entry.name.slice(0, -3), path.join(base, entry.name))
    }
    const skillFile = path.join(base, entry.name, "SKILL.md")
    if (kind === "dir" && entry.isDirectory() && !entry.name.startsWith(".") && !SYSTEM_SKILLS.has(entry.name) && fs.existsSync(skillFile)) {
      items.set(entry.name, skillFile)
    }
  }
  return items
}

function bodyLines(file) {
  const { body } = parseFrontmatter(fs.readFileSync(file, "utf8"))
  return body.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
}

function canonicalPath(root, category, name) {
  return category === "skills" ? path.join(root, "skills", name, "SKILL.md") : path.join(root, category, `${name}.md`)
}

// An accepted entry is either a bare line (any item) or "<category>/<name>: <line>" (that item only).
function isAccepted(accepted, category, name, line) {
  return accepted.has(line) || accepted.has(`${category}/${name}: ${line}`)
}

export function buildReport({ root, home, accepted = readList(root, "reconcile-accepted.txt") }) {
  const retired = readList(root, "retired.txt")
  const rows = []
  for (const [category, sources] of Object.entries(SOURCES)) {
    for (const [harness, rel, kind] of sources) {
      for (const [name, file] of listItems(path.join(home, rel), kind)) {
        if (retired.has(name)) continue
        const canonical = canonicalPath(root, category, name)
        if (!fs.existsSync(canonical)) {
          rows.push({ category, harness, name, status: "absorb", missing: bodyLines(file).length, lines: [] })
          continue
        }
        const have = new Set(bodyLines(canonical))
        const lines = [...new Set(bodyLines(file))].filter((l) => !have.has(l) && !isAccepted(accepted, category, name, l))
        rows.push({ category, harness, name, status: lines.length ? "merge" : "ok", missing: lines.length, lines })
      }
    }
  }
  return rows
}

function snapshot(rows, home, dest) {
  for (const row of rows) {
    const rel = SOURCES[row.category].find(([h]) => h === row.harness)[1]
    const src = row.category === "skills" ? path.join(home, rel, row.name) : path.join(home, rel, `${row.name}.md`)
    fs.cpSync(src, path.join(dest, row.harness, row.category, path.basename(src)), { recursive: true })
  }
}

function main(argv) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  const home = process.env.FBL_HOME ?? os.homedir()
  const category = argv.includes("--category") ? argv[argv.indexOf("--category") + 1] : null
  const rows = buildReport({ root, home }).filter((r) => !category || r.category === category)
  if (argv.includes("--snapshot")) snapshot(rows, home, argv[argv.indexOf("--snapshot") + 1])
  for (const r of rows.filter((x) => x.status !== "ok")) {
    console.log(`${r.status.toUpperCase()} ${r.category}/${r.name} (${r.harness}): ${r.missing} line(s)`)
    for (const line of r.lines.slice(0, 20)) console.log(`    + ${line}`)
  }
  const pending = rows.filter((r) => r.status !== "ok").length
  console.log(`RECONCILE: ${rows.length} compared, ${pending} pending`)
  if (argv.includes("--check") && pending > 0) process.exit(1)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2))
