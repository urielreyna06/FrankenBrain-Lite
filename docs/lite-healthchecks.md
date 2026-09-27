# Lite package healthcheck

This use case checks whether a cloned FrankenBrain Lite package still has its
required files and non-empty skill, agent, command, and common-rule catalogs.
Run `make health`, or `node scripts/lite-health.mjs --json` for structured output.
An error exits 1. An invalid CLI option exits 2. The command reads only; its
recovery suggestions are for a person to assess against a trusted checkout.

## Source and pin

Adapted from the ECC healthcheck and self-healer snapshot on the remote branch
`ecc-healthchecks-2026-09-24`, commit
`447ebec2c8596d9025b361491b22067c68b41443`. This commit is a root snapshot
of `ecc-universal` 2.2.0, not a descendant of Lite `master`; it is retained as
provenance, not merged as a Git ancestor. The CI check pins Node 20.19.0, matching
the snapshot's `.tool-versions`. Its Python 3.12.8 pin is not needed by this
Node-only use case.

ECC's original checks and repairs assume a particular home directory layout,
OpenCode plugins, Claude hooks, a separate memory vault, and an observation
store. Lite is a portable asset package and does not own those locations. Its
healthcheck therefore checks its own package only. The recovery plan does not
move plugins, remove skills, create symlinks, or write outside the checkout.
Use the existing `make check` for validation and secret scanning after a repair.
