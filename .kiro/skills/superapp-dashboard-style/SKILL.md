---
name: superapp-dashboard-style
description: Use when writing or editing an HTML dashboard, executive report, or data presentation for SuperApp/CWP Panama analytics — replicates the established house visual style (brand palette, Nohemi+Inter fonts, dark/light + ES/EN toggles, self-contained JSON-driven charts, no-JS portable reports) instead of a generic dashboard template. Also use when a user can't tell what a control, label or cell in such a dashboard means.
---

# SuperApp Dashboard Style

## Overview

Reference implementation for HTML dashboards/reports matching the SuperApp Team (CWP Panamá) house
style, reverse-engineered from 8 production dashboards and one executive report package. This is
the **visual/technical layer** (CSS, fonts, HTML scaffolding, data-loading pattern). For the
**content/judgment layer** (which KPIs, what order, how to word insights, which chart type) use
`superapp-dashboard-storytelling` — the two are meant to be used together.

**REQUIRED PAIRING:** Use `superapp-dashboard-storytelling` alongside this skill to decide *what*
goes in the dashboard before using this skill to decide *how it looks*.

## When to Use

- Asked to build/update an HTML dashboard, executive report, or presentation for SuperApp/CWP
  Panama analytics (growth, LOB, campaigns, incidents, comisiones, dormant users, etc.).
- Need a self-contained HTML file that opens by double-click (`file://`), with no build step, no
  CDN dependency for logic, and optionally no JS at all.
- Adapting an existing reference dashboard's look for a new dataset.

Not for generic/non-SuperApp dashboards, or for choosing what to measure (→
`superapp-dashboard-storytelling`).

## Two House Patterns

| Pattern | When | Reference example | Template |
|---|---|---|---|
| **A — Interactive single-file SPA** | Analyst-facing, needs toggles (unit/scope/month/lang), animated KPIs, hover tooltips, custom charts | Comisión Saving, MAU Rolling LOB, Dormant Users, Fanzone | `templates/interactive-dashboard-template.html` |
| **B — Static portable multi-page report** | Executive-facing, must work with zero JS/internet, printable/zippable, distributed by email | `SuperApp_Operations_Dashboard` (BotReports) | `templates/static-report-template.html` |

Default to **Pattern A** unless the user explicitly needs offline/no-JS distribution or a
multi-page printable package — then use **Pattern B**.

## Core Pattern (shared by both)

```
header (brand + controls)  →  KPI row (3-4 cards)  →  main grid: hero chart (1.55fr) + support panel (1fr)
                            →  insight/finding strip  →  footer (source, cutoff date, attribution)
```

- Copy the matching template from `templates/`, replace every `{{PLACEHOLDER}}`.
- Pull exact color tokens and font stack from `reference/palette-and-fonts.md` — don't invent new
  brand colors; `mamey` (#FF4713) is the one non-negotiable accent.
- Dark theme is the default (`data-theme="dark"`); light is a toggle, never the reverse.
- All visible text goes through an `I18N` dict + `data-i18n` attributes if the dashboard will be
  shared broadly within CWP — never hardcode a single language for wide-distribution work.
- Data loading (Pattern A): **read `INLINE_DATA` first, after `DOMContentLoaded`**; fetch the JSON
  only if no inline data exists — use `loadData()` from the template as-is. The older
  `fetch().catch(()=>INLINE_DATA)` order leaves the page blank on double-click (`file://`): fetch
  rejects before the parser reaches the data `<script>`.
- No chart libraries (Chart.js/D3/Plotly) — bars, funnels, segments, and sparklines are hand-rolled
  divs/SVG. This keeps files dependency-free and matches every reference dashboard.

## Quick Reference

| Need | Do this |
|---|---|
| KPI card with animated count-up | `<div class="val num" data-target="N">` + `animateNumbers()` (easeOutCubic, respects `prefers-reduced-motion`) |
| Segment/funnel bar | Stack `.seg` divs by `height:%` inside a `.bar`, color from `SEG_COLOR` map, tooltip via `mousemove` + fixed-position `.tip` div |
| Hover glow on KPI card | `.kpi:hover` + radial-gradient using `--mx/--my` custom properties set on `mousemove` |
| Static line chart, no JS | Inline `<svg>` with `<polyline>` + one `<circle>` per point wrapping a `<title>` for native tooltip (Pattern B) |
| Status heatmap (healthy/watch/critical) | `<div class="cell healthy|watch|critical">` — 3-state color classes, not a continuous gradient |
| Bilingual toggle | `I18N = {es:{...}, en:{...}}`, `t()` returns current dict, `data-i18n="key"` on static nodes, template-literal functions for dynamic sentences (e.g. `insight:(d)=>...`) |
| Author attribution block | HTML comment + `<meta name="author">` at top of `<head>` — see palette-and-fonts.md for what NOT to copy from reference files |
| Time series by segment/cohort | One chart, lines overlaid: default = total + main segments; preset buttons ("Todas" / "Sólo segmentos" / "Sólo total") + one `.chip` toggle per line (multi-select, ≥1 always on). Tiny segments start off. Axis rescales to visible lines, so turning the total off makes small segments readable — no separate tab per segment |
| Y axis labels | `niceMax()` from the template (4 steps of 1-2-2.5-5×10ⁿ) — never `max*1.08`, which prints ticks like 467/933 |
| Last day of data is incomplete | Cut the series at the last complete day (check `MAX(created_at)` of the last partition); don't plot a near-empty day as a hollow "partial" point |
| Toggle/selector labels | Full words with unit («N.º de personas», «Gasto medio 30 días (USD)») via `I18N` keys — never a hardcoded letter like `>N<`; add `<p class="desc" id="xHelp">` under the toggle and set its text per active option in the render function |
| ⓘ hint on every title/KPI | `window.HINTS=[{anchor,title,es,en}]` injected at build time from a catalog (`catalogo_*.py`) + `attachHints()` re-run after each render. Working reference: `FirstTimeBuyers/05_dashboards/src/common.js` + `scripts/build_dashboards.py` |
| Heatmap cell count | Keep the per-cell `n` in the data and offer it as a toggle option; tooltip states `n` people and the window |
| Republish an Artifact to the same URL | `Artifact` publish with `url`; if refused, `read` the live URL, diff it against the local build (only your edits should differ), then publish again |
| `<title>` | A name (2–4 words, e.g. "First Time Buyers Ejecutivo"), no "— subtitle": it names the Artifact/tab |
| Before delivering | Headless render of the built file via `file://` for every tab + 390 px width: 0 JS errors, no `NaN`/`undefined` in text, `scrollWidth` = viewport. Playwright: `require(~/.npm/_npx/*/node_modules/playwright)` |

## Common Mistakes

- Adding a chart library "for convenience" — breaks the zero-dependency, double-click-to-open
  property every reference file has.
- Making light theme the default — every reference dashboard defaults to dark.
- Hardcoding Spanish-only or English-only text in a dashboard meant for broad CWP distribution.
- Skipping `INLINE_DATA`, or reading it inside a `fetch().catch()` in a `<script>` placed before
  the data — both leave a blank page on `file://`. QA over `http://` hides it: always test the
  double-click path.
- Declaring the same `const` twice in one render function (e.g. a second `es = lang==="es"`):
  the whole tab silently renders empty — the headless render check catches it.
- One line per tab/toggle for segments that should be compared: the reader can't see which
  segment drives a peak. Overlay them with chips instead (Quick Reference).
- Single-letter or internal-name controls (`<button data-v="n">N</button>`): the user had to ask what «N» meant. Label with the unit, through `I18N`, plus the «Cada celda» help line.
- Headless QA that never opens the non-default tab/toggle: render functions for hidden tabs run only on click — open each tab (`#hash`) and click each toggle option in the check.
- Copying the reference files' author name/attribution comment verbatim into new work instead of
  the real author — see `reference/palette-and-fonts.md`.
- Building the visual shell before deciding the KPI story — do
  `superapp-dashboard-storytelling` first, this skill second.

## Files

- `templates/interactive-dashboard-template.html` — Pattern A skeleton, ready to fill in.
- `templates/static-report-template.html` — Pattern B skeleton, ready to fill in.
- `reference/palette-and-fonts.md` — exact color tokens, font stack, and the attribution rule.
