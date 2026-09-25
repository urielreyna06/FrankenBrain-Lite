---
description: List known projects and their instinct statistics
agent: build
---

# Projects Command

List project registry entries and per-project instinct/observation counts for continuous-learning-v2.

## Implementation

Run the instinct CLI through the `fbl` helper (same command in every harness):

```bash
fbl instinct projects $ARGUMENTS
```

`<homunculus>` below is the store `fbl instinct` resolves (default `~/.local/share/ecc-homunculus/`).

## Usage

```bash
/projects
```

## What to Do

1. Read `<homunculus>/projects.json`
2. For each project, display:
   - Project name, id, root, remote
   - Personal and inherited instinct counts
   - Observation event count
   - Last seen timestamp
3. Also display global instinct totals
