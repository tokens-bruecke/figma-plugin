---
title: "For AI agents"
description: "Agent-friendly docs, schemas and how agents can export tokens without the REST API."
---

This repository and the npm package ship agent-friendly docs:

- [llms.txt](https://github.com/tokens-bruecke/figma-plugin/blob/main/llms.txt) — entry point for LLM-based tools
- [skills/tokens-bruecke/SKILL.md](https://github.com/tokens-bruecke/figma-plugin/blob/main/skills/tokens-bruecke/SKILL.md) — an [agent skill](https://code.visualstudio.com/docs/copilot/customization/agent-skills) covering CLI usage, auth, config and exit codes; copy the `skills/tokens-bruecke` folder into your project's skills directory to teach your agent the CLI
- [schemas/cli-options.schema.json](https://github.com/tokens-bruecke/figma-plugin/blob/main/schemas/cli-options.schema.json) — machine-readable config schema
- [schemas/tokens-snapshot.schema.json](https://github.com/tokens-bruecke/figma-plugin/blob/main/schemas/tokens-snapshot.schema.json) — machine-readable input schema for `--input`

For scripted/agent usage prefer `--stdout --quiet` (pure JSON on stdout, logs on stderr) and pass tokens via environment variables. Run it as `npx tokens-bruecke@latest` so the agent always gets the newest release: plain `npx tokens-bruecke` can reuse an old cached copy. See [Update notice](../options/#update-notice).

## Agentic usage without the REST API

If your agent can run code inside Figma — a Figma agent, an MCP server with `evaluate_script`, or your own plugin — it already has Plugin API access to the open file. In that case it should **not** go through the REST API at all:

|                                                | REST API (`--file-key`) | Snapshot (`--input`)                |
| ---------------------------------------------- | ----------------------- | ----------------------------------- |
| Figma Enterprise plan                          | Required                | Not required                        |
| Personal access / OAuth token                  | Required                | Not required                        |
| File must be published / shared with the token | Yes                     | No — works on whatever file is open |
| Network calls to Figma                         | Several per export      | None                                |

The agent's job is only to dump data; the CLI still owns every transform, so aliases, modes, scopes and DTCG formatting behave exactly as they do in REST mode.

**1. Extract the snapshot from inside Figma.** Plugin API objects are live proxies, so `JSON.stringify` on them may serialize as empty — copy the fields onto plain objects first:

```js
const snapshot = {
  variableCollections: (
    await figma.variables.getLocalVariableCollectionsAsync()
  ).map((c) => ({
    id: c.id,
    name: c.name,
    defaultModeId: c.defaultModeId,
    modes: c.modes.map((m) => ({
      modeId: m.modeId,
      name: m.name,
      parentModeId: m.parentModeId,
    })),
    variableIds: c.variableIds,
    // Extended collections only (undefined otherwise)
    isExtension: c.isExtension,
    parentVariableCollectionId: c.parentVariableCollectionId,
    rootVariableCollectionId: c.rootVariableCollectionId,
    variableOverrides: c.variableOverrides,
  })),
  variables: (await figma.variables.getLocalVariablesAsync()).map((v) => ({
    id: v.id,
    name: v.name,
    variableCollectionId: v.variableCollectionId,
    resolvedType: v.resolvedType,
    description: v.description,
    scopes: v.scopes,
    codeSyntax: v.codeSyntax,
    valuesByMode: v.valuesByMode,
  })),
  // Optional — only needed if the config enables the matching style type
  paintStyles: (await figma.getLocalPaintStylesAsync()).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    paints: s.paints,
    boundVariables: s.boundVariables,
  })),
};

const json = JSON.stringify(snapshot, null, 2);
```

Text, effect and grid styles follow the same pattern — see [schemas/tokens-snapshot.schema.json](https://github.com/tokens-bruecke/figma-plugin/blob/main/schemas/tokens-snapshot.schema.json) for the fields each one needs.

**2. Pipe it through the CLI.**

```bash
# From a file the agent wrote
npx tokens-bruecke@latest --input snapshot.json --output tokens.json

# Or straight from stdin, no temp file
my-figma-agent dump-tokens | npx tokens-bruecke@latest --input - --stdout --quiet > tokens.json

# All the usual options still apply
npx tokens-bruecke@latest --input snapshot.json --config config.json --split-by-mode --output ./tokens
```

Snapshot mode ignores `FIGMA_API_KEY` / `FIGMA_FILE_KEY`, so a token exported in the environment won't get in the way. Passing `--api-key`, `--oauth-token` or `--file-key` explicitly alongside `--input` is rejected as a conflict.

On a bad snapshot the CLI exits `1` and names the offending key — for example `variables[3] is missing a string "variableCollectionId"` — so an agent can correct its dump and retry without guesswork.

:::note
Aliases pointing at variables outside the snapshot (typically library variables from another file) export as `"#missing#"`, the same as in REST mode. To resolve them, include those variables in the `variables` array.
:::
