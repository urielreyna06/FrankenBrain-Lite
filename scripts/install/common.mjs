// scripts/install/common.mjs
// Shared installer state: reversible moves, backups, managed writes and CLI calls.
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

export function createContext({ home, root, date, skipCli }) {
  const stateFile = path.join(home, ".local", "share", "frankenbrain", "install-state.json")
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : { moves: [], created: [], edits: [] }
  return { home, root, date, skipCli, stateFile, state }
}

export function saveState(ctx) {
  fs.mkdirSync(path.dirname(ctx.stateFile), { recursive: true })
  fs.writeFileSync(ctx.stateFile, `${JSON.stringify(ctx.state, null, 2)}\n`)
}

export function disabledPath(ctx, harnessRoot, relative) {
  return path.join(harnessRoot, "_disabled", ctx.date, relative)
}

export function moveToDisabled(ctx, from, harnessRoot, relative) {
  if (!fs.existsSync(from)) return false
  const to = disabledPath(ctx, harnessRoot, relative)
  if (fs.existsSync(to)) throw new Error(`refusing to overwrite ${to}`)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.renameSync(from, to)
  ctx.state.moves.push({ from, to })
  return true
}

export function writeManaged(ctx, file, content) {
  const existed = fs.existsSync(file)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
  if (!existed && !ctx.state.created.includes(file)) ctx.state.created.push(file)
}

export function editWithBackup(ctx, file, transform) {
  if (!fs.existsSync(file)) return
  const original = fs.readFileSync(file, "utf8")
  const updated = transform(original)
  if (updated === original) return
  if (!ctx.state.edits.some((e) => e.file === file)) {
    const backup = `${file}.fbl-backup-${ctx.date}`
    fs.writeFileSync(backup, original)
    ctx.state.edits.push({ file, backup })
  }
  fs.writeFileSync(file, updated)
}

export function linkHelper(ctx) {
  const link = path.join(ctx.home, ".local", "bin", "fbl")
  const target = path.join(ctx.root, "bin", "fbl")
  if (fs.existsSync(link) && fs.readlinkSync(link) === target) return
  if (fs.existsSync(link)) moveToDisabled(ctx, link, path.join(ctx.home, ".local", "bin"), "fbl")
  fs.mkdirSync(path.dirname(link), { recursive: true })
  fs.symlinkSync(target, link)
  if (!ctx.state.created.includes(link)) ctx.state.created.push(link)
}

export function runCli(ctx, command, args) {
  if (ctx.skipCli) return ""
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180000 })
}

export function restoreAll(ctx) {
  for (const file of [...ctx.state.created].reverse()) fs.rmSync(file, { force: true, recursive: true })
  for (const { from, to } of [...ctx.state.moves].reverse()) {
    if (!fs.existsSync(to)) continue
    fs.mkdirSync(path.dirname(from), { recursive: true })
    fs.renameSync(to, from)
  }
  for (const { file, backup } of ctx.state.edits) {
    fs.writeFileSync(file, fs.readFileSync(backup, "utf8"))
    fs.rmSync(backup)
  }
  pruneEmptyDisabled(ctx)
  fs.rmSync(ctx.stateFile, { force: true })
  pruneEmpty(path.dirname(ctx.stateFile), ctx.home)
}

function pruneEmpty(dir, stop) {
  while (dir.startsWith(stop) && dir !== stop && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir)
    dir = path.dirname(dir)
  }
}

function pruneEmptyDisabled(ctx) {
  for (const { to } of ctx.state.moves) pruneEmpty(path.dirname(to), ctx.home)
}
