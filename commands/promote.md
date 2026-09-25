---
description: Promote project-scoped instincts to global scope
agent: build
---

# Promote Command

Promote instincts from project scope to global scope in continuous-learning-v2.

## Implementation

Run the instinct CLI through the `fbl` helper (same command in every harness):

```bash
fbl instinct promote $ARGUMENTS
```

`<homunculus>` below is the store `fbl instinct` resolves (default `~/.local/share/ecc-homunculus/`).

## Usage

```bash
/promote                      # Auto-detect promotion candidates
/promote --dry-run            # Preview auto-promotion candidates
/promote --force              # Promote all qualified candidates without prompt
/promote grep-before-edit     # Promote one specific instinct from current project
```

## What to Do

1. Detect current project
2. If `instinct-id` is provided, promote only that instinct (if present in current project)
3. Otherwise, find cross-project candidates that:
   - Appear in at least 2 projects
   - Meet confidence threshold
4. Write promoted instincts to `<homunculus>/instincts/personal/` with `scope: global`
