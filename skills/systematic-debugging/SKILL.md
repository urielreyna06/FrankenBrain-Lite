---
name: systematic-debugging
description: >-
  USE when investigating a bug, failure, or unexpected behavior, before
  attempting a fix. Enforces root-cause analysis over symptom patching.
  TRIGGER when something is broken, erroring, or behaving unexpectedly.
metadata:
  origin: superpowers
---

# Systematic Debugging

Find the root cause before changing code. A fix without a diagnosis is a guess.

## The Iron Law

```
NO FIX WITHOUT A REPRODUCED FAILURE AND AN IDENTIFIED ROOT CAUSE
```

If you can't reproduce it and can't name why it happens, you're not ready to fix.

## 4-phase process

1. **Reproduce.** Get a reliable, minimal reproduction. Write a failing test that
   captures the bug (this becomes the regression test). If you can't reproduce it,
   gather more evidence before touching code.
2. **Isolate.** Narrow to the smallest failing case. Trace the actual execution
   path — read the code, add logging, inspect state. Follow evidence, not hunches.
   Confirm where reality diverges from expectation.
3. **Identify root cause.** Explain WHY it fails, not just where. Trace back to the
   origin (a wrong assumption, a missing guard, a bad input). Distinguish the root
   cause from its symptoms.
4. **Fix + verify.** Fix the root cause (not the symptom). Watch the failing test
   go green. Run the full suite. Confirm the original symptom is gone.

## Red flags — STOP

- Changing code before reproducing the failure.
- "Let me try X and see if it helps" (shotgun debugging).
- Patching the symptom (swallowing the error, adding a retry) without knowing why.
- Multiple simultaneous changes so you can't tell what fixed it.
- "It works now" without understanding what changed.

## Techniques

- **Root-cause tracing:** follow the failure backward through the call chain to
  its origin.
- **Defense in depth:** once found, ask whether the same class of bug can occur
  elsewhere; add a guard at the right layer.
- **Condition-based waiting:** for flaky/timing bugs, wait on a real condition,
  never a fixed sleep.

Never fix a bug without a test that reproduces it (see `test-driven-development`).
