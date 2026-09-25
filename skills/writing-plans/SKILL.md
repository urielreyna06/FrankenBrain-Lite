---
name: writing-plans
description: >-
  USE when you have an approved spec/requirements for a multi-step task, before
  touching code. Produces a bite-sized, self-contained implementation plan.
  TRIGGER after brainstorming's architectural path is approved.
metadata:
  origin: superpowers
---

# Writing Plans

Write an implementation plan an engineer with zero context for this codebase can
execute. Document which files to touch, the actual code, how to test. Bite-sized
tasks. DRY, YAGNI, TDD, frequent commits.

Announce at start: "I'm using the writing-plans skill to create the plan."
Save to `docs/plans/YYYY-MM-DD-<feature>.md` (user preference overrides).

## File structure first

Map which files are created/modified and each one's single responsibility before
defining tasks. Prefer small focused files; files that change together live
together. In existing codebases, follow established patterns.

## Task right-sizing

A task = the smallest unit that carries its own test cycle and is worth a fresh
reviewer's gate. Fold setup/scaffolding/docs into the task whose deliverable needs
them. Each task ends with an independently testable deliverable.

## Bite-sized steps (2-5 min each)

Write failing test → run it, see it fail → minimal implementation → run, see pass
→ commit. Each step is one action.

## Every task block includes

- **Files:** exact create/modify/test paths (with line ranges for modifies).
- **Interfaces:** what it consumes from earlier tasks and produces for later ones
  (exact signatures — the implementer sees only their own task).
- **Steps:** checkbox steps with actual code blocks and exact run commands +
  expected output.

## No placeholders (these are plan failures)

No "TBD/TODO/implement later", no "add appropriate error handling" without the
code, no "write tests for the above" without the test code, no "similar to Task
N" (repeat it — tasks may be read out of order), no references to undefined
types/functions.

## Self-review after writing

1. **Spec coverage:** every spec requirement maps to a task.
2. **Placeholder scan:** none of the red flags above.
3. **Type consistency:** signatures/names match across tasks.
4. **Review focus:** the input classes the spec implies but no task tests — add
   each to the owning task.

Fix inline. If a spec requirement has no task, add the task.

## Execution handoff

Save, self-review, link it for the user. Offer execution method: subagent-driven
(fresh subagent + reviewer per task; most thorough) or native (implement all
tasks in-session, one fresh whole-branch review at the end; cheapest). Recommend
one with a one-sentence reason. Wait for the user to review and choose.
