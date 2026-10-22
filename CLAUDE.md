# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- The shared instructions for all AI tools are in `AGENTS.md`, imported above. Add project rules **there**, not here, so other agents get them too. Use this file only for things specific to Claude Code.
- The deep-dive docs in `docs/agents/` are not loaded automatically. Read the one that matches the task before editing (the list is under "Deep-dive docs" in AGENTS.md).
- Run tests with `pnpm test` (runs once). `pnpm test:watch` starts watch mode and blocks the shell.
- `pnpm dev` is a long-running watch build. Start it in the background, or use `pnpm run build:plugin` for a one-off build.
- End-to-end check without a Figma Enterprise token: if a Figma MCP server with Plugin API access is connected (e.g. one that can run code in the open file), dump a snapshot as described in README "Agentic usage without the REST API", then run `node bin/cli.js --input <snapshot.json> --stdout --quiet` after `pnpm run build:cli`. That exercises the same transforms as the plugin.
