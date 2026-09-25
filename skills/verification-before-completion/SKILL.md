---
name: verification-before-completion
description: >-
  USE when about to claim work is complete, fixed, or passing, before committing
  or creating PRs. Requires running verification commands and confirming output
  before any success claim. TRIGGER before any completion/success statement.
metadata:
  origin: superpowers
---

# Verification Before Completion

**Core principle:** evidence before claims, always. Violating the letter violates
the spirit.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in THIS message, you cannot claim it
passes.

## The gate function

Before claiming any status or expressing satisfaction:
1. **Identify** the command that proves the claim.
2. **Run** the full command fresh.
3. **Read** the full output, check exit code, count failures.
4. **Verify** the output confirms the claim (if not, state actual status with
   evidence).
5. **Only then** make the claim, WITH the evidence.

Skipping any step = lying, not verifying.

## What each claim requires

- "Tests pass" → test command output: 0 failures (not "should pass").
- "Build succeeds" → build exit 0 (linter passing is NOT enough).
- "Bug fixed" → test the original symptom passes.
- "Regression test works" → red-green verified (revert fix → MUST fail → restore
  → pass).
- "Agent completed" → check the VCS diff, don't trust the agent's report.
- "Requirements met" → line-by-line checklist against the plan.

## Red flags — STOP

Using "should/probably/seems to" · expressing satisfaction before verification
("Great!/Perfect!/Done!") · about to commit/push/PR without verification ·
trusting agent success reports · partial verification · "just this once" · tired
and wanting it over · ANY wording implying success without having run
verification.

Applies to exact phrases, paraphrases, synonyms, and any implication of success.
