---
description: Delete pending instincts older than 30 days that were never promoted
---

# Prune Pending Instincts

Remove expired pending instincts that were auto-generated but never reviewed or promoted.

## Implementation

Run the instinct CLI through the `fbl` helper (same command in every harness):

```bash
fbl instinct prune $ARGUMENTS
```

## Usage

```
/prune                    # Delete instincts older than 30 days
/prune --max-age 60      # Custom age threshold (days)
/prune --dry-run         # Preview without deleting
```
