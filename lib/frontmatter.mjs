// lib/frontmatter.mjs
// Minimal parser for the flat frontmatter used across FrankenBrain-Lite:
// scalars, block scalars (`>`, `>-`, `|`, `|-`), one level of nested maps
// such as `tools:`, and lists under a nested key (`metadata.requires`).
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
const BLOCK_SCALAR = /^[>|][-+]?$/

function coerce(raw) {
  const value = raw.trim()
  if (value === "true") return true
  if (value === "false") return false
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value)
  return value.replace(/^(['"])(.*)\1$/, "$2")
}

function indentOf(line) {
  return line.length - line.trimStart().length
}

// Consumes indented continuation lines of a block scalar starting at `start`.
function readBlock(lines, start, style) {
  const collected = []
  let i = start
  while (i < lines.length && (lines[i].trim() === "" || indentOf(lines[i]) > 0)) {
    collected.push(lines[i].trim())
    i += 1
  }
  const text = style.startsWith("|") ? collected.join("\n") : collected.filter(Boolean).join(" ")
  return { value: text.trim(), next: i }
}

function addNested(data, currentKey, line) {
  const parent = data[currentKey]
  const item = /^\s{4,}-\s+(.*)$/.exec(line)
  const lastKey = Object.keys(parent).at(-1)
  if (item && lastKey !== undefined) {
    const prev = parent[lastKey]
    const list = Array.isArray(prev) ? prev : []
    parent[lastKey] = [...list, coerce(item[1])]
    return true
  }
  const nested = /^\s{2,}([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
  if (!nested) return false
  parent[nested[1]] = nested[2].trim() === "" ? [] : coerce(nested[2])
  return true
}

export function parseFrontmatter(text) {
  const match = FRONTMATTER.exec(text)
  if (!match) return { data: {}, body: text }
  const data = {}
  const lines = match[1].split(/\r?\n/)
  let currentKey = null
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    i += 1
    if (!line.trim() || line.trim().startsWith("#")) continue
    const isNestedParent = currentKey && data[currentKey] && typeof data[currentKey] === "object" && !Array.isArray(data[currentKey])
    if (indentOf(line) > 0 && isNestedParent && addNested(data, currentKey, line)) continue
    const top = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!top) throw new Error(`unsupported frontmatter line: ${line}`)
    currentKey = top[1]
    const raw = top[2].trim()
    if (BLOCK_SCALAR.test(raw)) {
      const block = readBlock(lines, i, raw)
      data[currentKey] = block.value
      i = block.next
      continue
    }
    data[currentKey] = raw === "" ? {} : coerce(raw)
  }
  return { data, body: match[2] }
}
