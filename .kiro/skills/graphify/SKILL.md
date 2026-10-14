---
name: graphify
description: "Always invoke autonomously for codebase architecture, file relationships, or where-is-X questions — do not wait for /graphify. If graphify-out/graph.json exists, run graphify query/path/explain or read GRAPH_REPORT.md BEFORE grepping. After code edits, graphify update . (AST, no LLM). Turns code/docs into a local knowledge graph."
---

# /graphify

## Autonomy

Do not wait for the user to type `/graphify`. If `graphify-out/graph.json` exists, treat architecture and "where/how does X" questions as graph queries first (`graphify query`, `path`, `explain`, or `GRAPH_REPORT.md`). After code edits in-session, run `graphify update .` (AST-only).

## Lazy-Loaded Details

Load `references/guide.md` only when you need the full build/query/update runbook, exact command blocks, subagent extraction workflow, export modes, or troubleshooting details.

Keep the sibling reference files intact; the full guide still routes to:

- `references/github-and-merge.md`
- `references/transcribe.md`
- `references/extraction-spec.md`
- `references/exports.md`
- `references/query.md`
- `references/add-watch.md`
- `references/hooks.md`
- `references/update.md`

## Inline Essentials

- `/graphify --help` or `/graphify -h`: print the Usage section from `references/guide.md` and stop.
- Existing graph + natural-language codebase question: run `graphify query "<question>"` before grep.
- No path supplied: use `.`.
- Code edits made in-session: run `graphify update .` before claiming the graph is current.
- Graphify code extraction is AST-only and does not require an API key; semantic extraction details live in the guide.
