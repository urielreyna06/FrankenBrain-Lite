---
name: test-driven-development
description: >-
  USE when implementing any feature or bugfix, before writing implementation
  code. Enforces RED-GREEN-REFACTOR. TRIGGER during any implementation task.
metadata:
  origin: superpowers
---

# Test-Driven Development (TDD)

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** if you didn't watch the test fail, you don't know if it tests
the right thing. Violating the letter of the rules violates the spirit.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Wrote code before the test? Delete it. Start over — don't keep it as "reference",
don't adapt it. Implement fresh from tests.

## Red-Green-Refactor

1. **RED — write one failing test.** One behavior, clear name, real code (no mocks
   unless unavoidable). Show the desired API.
2. **Verify RED (MANDATORY).** Run it. Confirm it FAILS for the right reason
   (feature missing, not a typo). Passes immediately? You're testing existing
   behavior — fix the test.
3. **GREEN — minimal code to pass.** Simplest thing that works. No extra features,
   no over-engineering (YAGNI).
4. **Verify GREEN (MANDATORY).** Run it. Test passes, output pristine. Then run
   the PROJECT'S full suite (`pytest`/`npm test`/`cargo test`), not just your
   file — a green single test is not a green suite. Report any failure by name,
   even one you didn't cause.
5. **REFACTOR — clean up while green.** Remove duplication, improve names. Don't
   add behavior.

## When to use

Always: new features, bug fixes, refactoring, behavior changes. Exceptions (ask
the user): throwaway prototypes, generated code, config files.

## Red flags — STOP and start over

Code before test · test after implementation · test passes immediately · can't
explain why the test failed · "too simple to test" · "I'll test after" · "already
manually tested" · "deleting my work is wasteful" (sunk cost) · "keep as
reference" · "TDD is dogmatic, I'm being pragmatic". All mean: delete, restart
with TDD.

## Bug fixes

Never fix a bug without a test. Write a failing test that reproduces it, then the
TDD cycle. The test proves the fix and prevents regression.

## When stuck

Hard to test = design too complicated / too coupled (use dependency injection).
Don't know how to test = write the wished-for API and assertion first, or ask.
