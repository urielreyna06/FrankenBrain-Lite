---
name: skill-scout
description: Use when the user wants to create, build, fork, or find a skill for a workflow, or when you notice a repeated manual process, recurring request, or reusable procedure mid-session — inventories existing skills, commands, agents, hooks, rules and instincts, then decides reuse vs improve vs create with a decision matrix.
metadata:
  origin: community
---

# Skill Scout

Use this skill before creating a new skill. The goal is to avoid duplicating
existing capabilities, prefer extending what exists, and vet anything external
before adoption. Priority order: **reuse > improve > create**.

Source: salvaged from stale community PR #1232 by `redminwang`.

## When to Use

- The user says "create a skill", "build a skill", "make a skill", or "new
  skill".
- The user asks "is there a skill for X?" or "does a skill exist that does Y?"
- The user describes a workflow and you are about to suggest creating a new
  skill.
- The user wants to fork or extend an existing skill.
- You notice an opportunity mid-session: a process repeated 2+ times, a
  recurring request, a re-written prompt, a recurring report or validation, or
  a procedure that could be written down step by step. Record the evidence
  (what repeated, where, how often) — never propose from assumptions.
- `learn-eval` or `evolve` produced a skill candidate.

If the user explicitly says to skip search or create from scratch, acknowledge
that and proceed with the requested creation workflow.

## How It Works

### Step 1 - Capture Intent

Extract:

- The task the skill should perform.
- The trigger conditions for using it.
- The domain, tools, frameworks, or data sources involved.
- Three to five search keywords plus useful synonyms.

### Step 2 - Search Local Sources

Inventory every local capability type, not only skills — a command, agent,
hook, rule or instinct may already cover the need:

```bash
R="$(fbl root)"
ls "$R/skills" "$R/commands" "$R/agents" "$R/rules"/*/ 2>/dev/null
grep -RilE "keyword|synonym" "$R/skills" "$R/commands" "$R/agents" "$R/rules" "$R/hooks" 2>/dev/null
fbl instinct status 2>/dev/null | grep -iE "keyword|synonym"
```

Also check the skills and agents listed in the current session context, and
superpowers skills. Then search skill names specifically. Local sources are preferred
because they are already part of the user's environment.

```bash
find "$(fbl root)/skills" -maxdepth 2 -name SKILL.md 2>/dev/null | grep -iE "keyword|synonym"
find ~/.claude/plugins/marketplaces ~/.cache/opencode/packages -path '*/skills/*/SKILL.md' 2>/dev/null | grep -iE "keyword|synonym"
```

Also list the harness skills directory named in the bootstrap "Harness facts".

Then search frontmatter descriptions:

```bash
grep -RilE "keyword|synonym" "$(fbl root)/skills" ~/.cache/opencode/packages 2>/dev/null
```

### Step 3 - Search Remote Sources

Use available GitHub and web search tools. Prefer concise queries:

```bash
gh search repos "claude code skill keyword" --limit 10 --sort stars
gh search code "name: keyword" --filename SKILL.md --limit 10
```

For web search, use at most three targeted queries such as:

```text
"claude code skill" keyword
"SKILL.md" keyword
"everything-claude-code" keyword
```

### Step 4 - Vet External Matches

Before recommending any external skill for adoption or forking:

- Read the `SKILL.md` frontmatter and instructions.
- Look for unexpected shell commands, file writes, network calls, credential
  handling, or package installs.
- Check whether the repository appears maintained.
- Prefer copying into a fresh local branch and reviewing the diff over editing
  marketplace originals.

### Step 5 - Rank Results

Rank candidates by:

1. Exact keyword match in the skill name.
2. Keyword or synonym match in description.
3. Local installed or marketplace source.
4. Maintained GitHub source with recent activity.
5. Web-only mention.

Cap the final list at 10 results.

### Step 6 - Evaluate Reuse

For the best local match, answer with evidence:

1. Does an existing capability cover the need? **Yes / Partially / No** —
   estimate coverage (%) and name what is missing.
2. Can it be extended without breaking compatibility (triggers, callers,
   tests) or adding disproportionate complexity? **Yes / No**
3. Does the value justify the change? Weigh frequency, time saved, errors
   avoided, future reuse against maintenance cost. **Yes / No**

If the answer leads to improving, write a **Gap Analysis**: current
capabilities, missing capabilities, limitations, minimal changes, dependencies,
expected impact, and **Risk** (Low / Medium / High).

Create a new skill only when no capability is reusable, extending would add
too much complexity, the function has its own identity, and the value
justifies future maintenance.

### Step 7 - Present the Decision

Deliver, per opportunity:

- **Opportunity summary** — tentative name, problem, observed trigger,
  estimated frequency, estimated impact.
- **Existing capability assessment** — related capabilities, coverage,
  reuse and extension possibilities.
- **Decision Matrix**:

| Criterion | Result |
| --- | --- |
| Existing capability | Yes/No |
| Partial coverage | Yes/No |
| Can be improved | Yes/No |
| Value justifies change | Yes/No |
| Requires new skill | Yes/No |

- **Final recommendation** — exactly one, with technical justification:

| Option | Meaning |
| --- | --- |
| Reuse existing | Invoke or install a matching capability as-is. |
| Improve existing | Extend the closest local capability (Gap Analysis above). |
| Create new | Build a new skill with `writing-skills` after confirming no reusable match. |

Only change or create anything after the user chooses that path. Improving a
local FBL skill follows the normal workflow (test first, then `make check`).

## Examples

### Result Table

```markdown
| # | Skill | Source | Why it matches | Gap |
| --- | --- | --- | --- | --- |
| 1 | article-writing | Local ECC | Drafts articles and guides | Not focused on release notes |
| 2 | content-engine | Local ECC | Multi-format content workflow | Heavier than needed |
| 3 | blog-writer | GitHub | Blog writing skill with recent commits | Needs security review |
```

### User-Facing Summary

```markdown
I found two close local matches and one external candidate. The closest fit is
`article-writing`; it covers drafting and revision, but it does not include the
release-note checklist you asked for. I can either use it as-is, fork it into a
release-note variant, or create a fresh skill.
```

## Anti-Patterns

- Do not jump directly to new skill creation when a search is reasonable.
- Do not install external skills without reading them first.
- Do not present a long unranked list of weak matches.
- Do not inventory only skills; commands, agents, hooks and instincts count.
- Do not fork a near-duplicate when a small extension would do.
- Do not treat web-only mentions as trusted sources.
- Do not edit installed marketplace originals in place.

## Related

- `search-first` - General search-before-building workflow.
- `continuous-learning-v2`, `learn-eval`, `evolve` - Detect skill candidates
  from sessions and instincts; route them here before saving.
- `config-gc` - Prune redundant or stale skills after the ecosystem grows.
- `writing-skills` - Author and test a new skill once creation is chosen.
