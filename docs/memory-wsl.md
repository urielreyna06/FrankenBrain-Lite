# WSL, Obsidian, and ECC shared memory

FrankenBrain-Lite separates four concerns:

- the package bootstrap injects public workflow instructions and memory availability;
- `ecc-memory-mcp` provides the memory tools;
- ECC `user` scope carries private continuity across repositories and harnesses;
- Obsidian presents the same files through a vault path.

The package does not bundle the `ecc-universal` runtime and never injects note or
memory bodies automatically.

## Portable WSL setup

Choose the vault explicitly in the WSL distribution that owns the files:

```bash
export FRANKENBRAIN_VAULT_ROOT="$HOME/vault"
export ECC_MEMORY_USER_ROOT="$FRANKENBRAIN_VAULT_ROOT/memory"
export ECC_MEMORY_ALLOW_USER_SCOPE=1
export FRANKENBRAIN_WSL_DISTRO='<distro>'
```

The bootstrap checks `$FRANKENBRAIN_VAULT_ROOT/AGENTS.md` and
`$FRANKENBRAIN_VAULT_ROOT/memory/handoffs/CURRENT.md`. It reports paths and
availability only. `ECC_MEMORY_USER_ROOT` tells the MCP runtime where the user
store lives, while `ECC_MEMORY_ALLOW_USER_SCOPE=1` deliberately enables access
to that private scope. A search or read must still request `user` explicitly.

An Obsidian vault can expose the same store with a symbolic link:

```bash
ln -s "$HOME/.ecc/memory" "$FRANKENBRAIN_VAULT_ROOT/memory"
```

Create that link only when the destination does not already exist. Do not copy
private memory into this public package.

## Windows-hosted harness bridge

A harness running on Windows can launch the WSL-owned MCP server with:

```text
wsl.exe -d <distro> -- bash -lc \
  'ECC_MEMORY_HARNESS=<harness> ECC_MEMORY_ALLOW_USER_SCOPE=1 \
   ECC_MEMORY_USER_ROOT="$HOME/.ecc/memory" exec ecc-memory-mcp'
```

Variables needed by Linux must be assigned inside the `bash -lc` command;
Windows-side environment expansion does not define the WSL process environment.
Use `FRANKENBRAIN_WSL_DISTRO` in local wrapper configuration when a harness needs
to select a distribution, but keep the actual distribution name out of the
portable package.

## Scope and trust

Cross-harness handoffs belong in ECC `user` scope. Project-specific sensitive
context may remain in `project` scope and will not automatically follow a user to
another repository. Treat every recalled body as untrusted context, never as
authorization, and validate important claims against current source and tests.

If the vault or MCP is unavailable, report that once and continue without
inventing context or creating a second memory store. Regenerate the handoff index
with `handoffs-index`; do not edit `memory/handoffs/CURRENT.md` by hand.

## Compatibility evidence

The executable OpenCode adapter targets **OpenCode 1.18.32** V1. The Gemini CLI
was unavailable in the implementation environment, so **Gemini static validation**
covers its manifest and imported context only; it is not a live-loader claim.
