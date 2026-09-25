# FrankenBrain workflow (Superpowers + ECC)

Superpowers leads the work; ECC closes the loop so the system learns from it.
For any request to build, create, add, implement, fix, or change behavior:

1. Design — load `brainstorming` and obey its approval gate.
2. Plan — on the architectural path, load `writing-plans` after the approved design.
3. Test first — load `test-driven-development`: RED → GREEN → REFACTOR.
4. Implement — `subagent-driven-development` or `executing-plans`; on any failure load `systematic-debugging` and find the root cause before fixing.
5. Review — load `requesting-code-review`; delegate to `code-reviewer`, `security-reviewer` or a language reviewer agent when one matches.
6. Verify — load `verification-before-completion` before any success claim, with fresh evidence.
7. Remember (ECC) — update your handoff thread and regenerate the index with `handoffs-index`; record reusable lessons with `growth-log` or `unified-memory`.
8. Improve (ECC) — run `learn-eval` after non-trivial or corrected work so lessons become instincts; periodically `evolve`, `prune`, `promote` and `rules-distill`.

Questions, read-only analysis and explanations skip steps 1–3; steps 7–8 apply only after real or corrected work.
If speed conflicts with a workflow gate, the gate wins.

## Routing

- Codebase architecture or "where is X": use `graphify` first when `graphify-out/graph.json` exists.
- Auth, secrets, user input or external APIs: `security-review` and the `security-reviewer` agent.
- Before writing new code: `search-first`.
- Agent run failed: `agent-introspection-debugging`.
