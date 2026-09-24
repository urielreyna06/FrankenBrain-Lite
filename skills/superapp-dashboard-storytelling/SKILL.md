---
name: superapp-dashboard-storytelling
description: Use when deciding what a SuperApp/CWP Panama dashboard or executive report should say — which KPIs to headline, how to order them, how to write titles/insights/alerts, which chart fits a KPI, and how to avoid misleading executives with partial-period or double-counted data. Also use before presenting SuperApp numbers to leadership, or when figures must match QuickSight or official business rules, or when a user questions or corrects a label, number or chart in one. Complements superapp-dashboard-style (which covers the HTML/CSS implementation).
---

# SuperApp Dashboard Storytelling

## Overview

Reverse-engineered narrative/KPI/UX rules from 8 SuperApp Team dashboards + 3 executive reports
(Comisión Saving, MAU Rolling LOB, Dormant Users, Fanzone, Campaign Plan, Offer Welcome, incident
report, BotReports operations package), plus the live QuickSight "Mas App" dashboard (9 sheets,
pulled via `aws quicksight describe-dashboard-definition`) for the analyst-facing patterns the
curated HTML layer omits. This skill is the **content/judgment layer**: what to
measure, how to order it, how to word it, which chart to pick. For the **visual/technical layer**
(CSS, palette, fonts, HTML scaffolding), use `superapp-dashboard-style` — the two are meant to be
used together on the same deliverable.

**REQUIRED PAIRING:** Use `superapp-dashboard-style` alongside this skill when the output is an
HTML artifact. This skill alone is enough for a written report, memo, or slide narrative.

## When to Use

- Building a new dashboard, executive report, or data presentation for SuperApp/CWP Panama and
  need to decide *what goes in it*, not just how it looks.
- Deciding which KPIs deserve the headline row vs. supporting detail.
- Writing a title, KPI label, insight sentence, or an alert/caveat for an anomaly.
- Choosing between a funnel, a bar chart, a line chart, a heatmap-matrix, or a pie chart for a
  given metric.
- Reviewing a draft dashboard/report for storytelling gaps: missing definitions, unmarked partial
  periods, non-exhaustive segmentation, noise vs. signal not separated.

Not for: choosing CSS colors/fonts/layout mechanics (→ `superapp-dashboard-style`), or for
dashboards outside the SuperApp/CWP Panama analytics domain (the KPI taxonomy and business
dimensions are domain-specific — the *narrative structure* generalizes, the KPI catalog does not).

## Core Pattern

Every reference dashboard follows the same 3-beat structure:

1. **Beginning — definitions + window.** State what each term means and what time window applies,
   with explicit `⚠️` caveats for what a number does NOT prove, before showing any figure.
2. **Middle — funnel with a multiplier.** `Universe → Filter → Result`, each step as absolute +
   % of the previous step, closing with a comparison (vs. baseline, vs. another cohort) — the
   comparison IS the insight, never the raw number alone.
3. **End — interpretation guardrail.** If a reader could misread a pattern (anomaly, dip, spike),
   close with an explicit "how to read this" note that pre-empts the wrong conclusion.

KPI headline row order: **universe size → captured opportunity → remaining opportunity**, max 4
KPIs, never unordered.

## Quick Reference

| Question | Rule |
|---|---|
| Analysis universe? | Before the first query, confirm with the user the universe and line of business (e.g. prepaid only vs all LOBs) and state it in the first line of the definitions banner. Wrong scope invalidates every number. |
| How many headline KPIs? | 3–4, ordered universe → opportunity captured → opportunity remaining |
| Pie chart or bars? | Bars/funnel by default. Pie is avoided across all 8 references — use only for ≤3 mutually exclusive categories with no need for sub-labels. |
| How to write an insight? | One sentence, bilingual, with a bolded number + a comparison/multiplier — never a paragraph. |
| Partial time period? | Mark with an asterisk or explicit label in the KPI itself, not just a footnote. |
| Segment/classification looks off? | Verify it's exhaustive and mutually exclusive (sums to 100% of the declared universe) before charting. |
| Raw events vs. real impact? | Separate "attempts/views" from "unique users" explicitly when the source is raw event logs — the noise/signal ratio is itself often the diagnostic KPI. |
| Every published dashboard needs | An accompanying AI_CONTEXT.md/CONTEXTO_AI.md: definitions, source table, window, computation, who can reproduce it. |
| Audience is analysts, not executives? | Consider QuickSight-only patterns: gauge-vs-goal, DoD/WoW/MoM delta KPIs beside the absolute value, a same-metric-per-segment KPI grid (≤5 segments), treemap for day/hour seasonality — see knowledge-base.md §11. |
| Numbers about to be presented? | Validate in 3 layers before publishing: internal recompute, official rules (MCP `superapp_business_rules`), reconciliation vs QuickSight via the vault cheatlist/lineage notes — knowledge-base.md §15 |
| Metric has no QuickSight equivalent? | Say so, show counts under alternative definitions, and state what it is NOT comparable to |
| Term for *new sign up*? | "Registro(s)", never "alta" (read as line activation in telco) nor "usuario nuevo" (migrated users) |
| Any control, column or cell label | Say what one unit is: «N.º de personas», «% que volvió a comprar», «Gasto medio 30 días (USD)». Never a bare letter/abbreviation («N», «rev30», «D7») — knowledge-base.md §16 |
| Toggle changes what cells mean? | One line under the toggle, «Cada celda: …», rewritten for the active option (incl. base and window) |
| Every title / KPI | ⓘ hint + a functional-doc entry generated from ONE catalog file (what it is, unit, formula, source, window) — never hand-written twice |
| Every % in a tooltip or sentence | Numerator / denominator + window next to it («7,402 / 39,938, semanas 6-jul→23-ago») |
| Material to study or defend the analysis? | Simple first: 30-second story, one visual per idea («de cada 100»), the sentence to say, what NOT to say; audit tables go in an annex |
| User corrected something? | Run the improvement loop (below) before closing the session |
| Need "% of total" or "MoM growth" formula? | Reuse the team's existing calculated-field definitions (`cf_month_over_month_growth`, `cf_percent_of_total_vs_all_channel`, `retention_week_pct_calc`) rather than inventing a new one — see knowledge-base.md §11. |

Full KPI classification framework (Strategic/Executive/Operational/Diagnostic/Monitoring), chart
selection rationale table, writing conventions, anti-pattern catalog, and the publication checklist
are in `reference/knowledge-base.md` — read it before building anything non-trivial; this file is
the map, that file is the territory.

## Improvement Loop (every correction feeds the skill)

Each user correction is a failing test for this skill. Before closing the session:

1. **Fix the instance** and grep the deliverable for siblings (same label, same window, same number elsewhere).
2. **Classify** it: validation · legibility · narrative · process. Add it as one row to knowledge-base.md §17 (correction log): symptom → root cause → rule.
3. **Turn it into a rule** where the next agent will read it: a Quick Reference row or checklist item (form matches the failure: missing element → required slot; wrong shape → recipe; skipped rule → prohibition).
4. **Sync** the copies (`~/.config/opencode/skills/`, `~/projects/FrankenBrain-Lite/skills/` and `.kiro/skills/`), run `make security && make validate` there; commit only with the user's OK.
5. **Record** the pattern in `~/vault/growth-log/YYYY-MM-DD.md` and the project memory/handoff.

Before delivering, run the **reader test** (knowledge-base.md §16): for every element, a non-author can say what one unit is, the base, the window and the source without asking. Any "no" is a correction you would otherwise get from the user.

## Common Mistakes

- Reporting raw event counts as if they were user impact (inflates severity/reach by 10-90x when
  the source has re-render loops or repeated views — always check event-vs-user ratio first).
- Comparing a partial month/period against closed ones without marking it — creates false trend lines.
- Segmenting into categories that overlap or don't sum to the universe — silently double-counts.
- Publishing a KPI without its source table, window, or validation reference — looks confident,
  isn't trustworthy, and nobody downstream can audit it.
- Validating only against itself (Python reproduces the SQL, screenshots look fine): consistency is not
  correctness. Contrast with official rules and QuickSight (§15).
- Counting `INITIATED` payments as failures, averaging per-category averages (day of month), or
  comparing rates with different windows — each shifted a headline number in the FTB analysis.
- Hard-coding numbers in insight text without a scripted check against `metrics.json`.
- Labels only the author understands (a bare «N», internal field names, «D7») — the user has to ask what they mean.
- Explaining an analysis with the audit: dense tables prove the numbers but don't explain them; the author themself couldn't follow it.
- Copying the reference authors' names/attribution into new work — see
  `superapp-dashboard-style/reference/palette-and-fonts.md` for the attribution rule.

## Note on Scope

Covers the "Mas App" QuickSight dashboard (account 265857264887, id
`9f861278-ade8-4476-bf44-f47566da508b`) and the 8 curated HTML dashboards. QuickSight access
requires `aws sso login --profile UrielReyna` first; if that dashboard's sheets change
significantly or a different QuickSight dashboard is in scope, re-pull with
`aws quicksight describe-dashboard-definition --aws-account-id 265857264887 --dashboard-id <id> --region us-east-1`
and refresh knowledge-base.md §11 rather than assuming these patterns still hold verbatim.
