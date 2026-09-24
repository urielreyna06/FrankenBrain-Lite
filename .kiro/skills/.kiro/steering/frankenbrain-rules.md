# FrankenBrain Lite — Always-Loaded Rules (Kiro, live workspace)

These ECC coding standards apply to all work in this workspace. They mirror
`../rules/common/` and are inlined here because those files sit outside this
workspace root. The canonical, referenced version lives at the project root's
`.kiro/steering/frankenbrain-rules.md`.

## Coding style
- **Immutability (critical):** create new objects, never mutate in place.
- **KISS / DRY / YAGNI:** simplest solution that works; extract real repetition;
  no speculative abstractions.
- **Many small files:** 200–400 lines typical, 800 max; organize by feature.
- **Naming:** `camelCase` vars/functions, `PascalCase` types/components,
  `UPPER_SNAKE_CASE` constants, `is/has/should/can` for booleans.
- **Avoid:** deep nesting (prefer early returns), magic numbers, long functions.

## Security
- Zero hardcoded credentials (API keys, passwords, tokens).
- Parameterized queries; no string-concatenated SQL.
- Validate and sanitize all input at system boundaries; treat external data as
  untrusted.
- Escape user input in UI to prevent XSS; guard against path traversal and CSRF.
- Keep dependencies patched; pin versions.

## Testing
- Cover new features and bug fixes with tests.
- Test behavior and edge cases, not just the happy path.
- Keep tests deterministic and isolated.
- Run the project's build and tests before declaring work complete.

## Code review
- Prioritize findings: Critical (must fix) → Warning (should fix) → Suggestion.
- Check readability, error handling, security, performance, and test coverage.
- Provide concrete fix examples, not just problem statements.
- Block on critical/high issues; allow merge with caution on medium-only.

---

Language-specific rules (e.g. `../rules/java/`) are not always-loaded. Reference
them explicitly when working in that stack.
