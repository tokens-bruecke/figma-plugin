---
name: tokens-bruecke
description: Export Figma variables and styles as DTCG design tokens JSON via the tokens-bruecke CLI, either from the Figma REST API or from a local snapshot of Plugin API data. Use when exporting design tokens from Figma, syncing Figma variables to a codebase, fetching Figma color/typography/spacing tokens, transforming variables extracted from inside a Figma file, or automating design-token pipelines in CI.
---

# tokens-bruecke CLI

Exports Figma variables (and optionally text/color/effect/grid styles) as [DTCG](https://tr.designtokens.org/format/) design tokens JSON.

## Two input modes

The CLI has one job — turn Figma variables and styles into DTCG tokens — and two ways to get the data in:

| Mode     | Flag                    | Needs auth? | Needs Enterprise? |
| -------- | ----------------------- | ----------- | ----------------- |
| REST API | `--file-key` + a token  | Yes         | Yes               |
| Snapshot | `--input <path>` or `-` | No          | No                |

Use **snapshot mode** when you can already read the file directly — e.g. you are an agent running inside Figma with Plugin API access. Dump the local variables and styles to JSON and pipe them in; no personal access token and no Enterprise plan required. See [Snapshot input](#snapshot-input--input) below.

## Requirements

Only for REST API mode:

- **Figma Enterprise plan** — the Figma Variables REST API is Enterprise-only. A `403` error usually means the plan or token scope is insufficient.
- Auth: a Figma **personal access token** (`--api-key` / `FIGMA_API_KEY`, needs `file_variables:read` scope) or an **OAuth token** (`--oauth-token` / `FIGMA_OAUTH_TOKEN`). Provide exactly one; OAuth wins if both are given. Prefer OAuth for pipelines (PATs expire after 90 days).
- Never hardcode tokens; prefer env vars — they are picked up automatically (see below).

## Quick start

```bash
# Auth via env var, no install needed:
export FIGMA_API_KEY=<your-token>
npx tokens-bruecke --file-key <FILE_KEY> --output tokens.json

# Print JSON to stdout instead (progress logs go to stderr):
npx tokens-bruecke -f <FILE_KEY> --stdout --quiet | jq .
```

```bash
# Or transform a local snapshot — no token, no Enterprise plan:
npx tokens-bruecke --input snapshot.json --output tokens.json
```

All flags can be set via `FIGMA_`-prefixed env vars: `FIGMA_API_KEY`, `FIGMA_OAUTH_TOKEN`, `FIGMA_FILE_KEY`, `FIGMA_OUTPUT`, etc. Explicit flags override env vars.

The file key is the segment after `figma.com/design/` in a Figma file URL.

## Creating a config file

`tokens-bruecke init` writes a config file. In a terminal it opens a keyboard-driven prompt (arrow keys, space to toggle, enter to confirm) covering color mode, styles to include, DTCG format and output layout.

**For agent and CI use, pass `-y`** — it skips the questions and writes the defaults:

```bash
npx tokens-bruecke init -y            # tokens-bruecke.config.json with defaults
npx tokens-bruecke init -y -p cfg.json --force
```

`init` also detects a non-TTY stdin and skips the prompts automatically, so it will not hang in a pipeline — but passing `-y` makes the intent explicit. Options: `-y/--yes`, `--force` (overwrite an existing file), `-p/--path`.

The generated file contains every option at its default plus a `$schema` link. Editing that file directly is usually faster than re-running `init`.

## Flags

| Flag                      | Alias | Description                                                                     |
| ------------------------- | ----- | ------------------------------------------------------------------------------- |
| `--api-key`               | `-a`  | Figma personal access token (one of api-key/oauth-token required)               |
| `--oauth-token`           | `-t`  | Figma OAuth token                                                               |
| `--file-key`              | `-f`  | Figma file key (required unless `--input`)                                      |
| `--input`                 | `-i`  | Read a local tokens snapshot instead of the REST API; `-` reads stdin           |
| `--output`                | `-o`  | Output file path, or directory when splitting (required unless `--stdout`)      |
| `--stdout`                |       | Print tokens JSON to stdout; mutually exclusive with `--output` and split flags |
| `--config`                | `-c`  | Path to a JSON config file (see below)                                          |
| `--split-by-collection`   | `-s`  | One `{Collection}.tokens.json` file per collection in the output dir            |
| `--split-by-mode`         | `-m`  | One `{Collection}/{Mode}.tokens.json` file per mode                             |
| `--omit-collection-names` |       | Merge all tokens into a single namespace (drop collection groups)               |
| `--quiet`                 | `-q`  | Suppress progress logs (errors still printed to stderr)                         |
| `init` (subcommand)       |       | Create a config file; pass `-y` in non-interactive contexts                     |
| `--help` / `--version`    | `-h`  | Usage / version                                                                 |

Precedence: explicit CLI flags > `FIGMA_*` env vars > config file > defaults.

## Snapshot input (`--input`)

`--input <path>` reads a JSON snapshot of a Figma file's local variables and styles instead of calling the REST API. `--input -` reads stdin:

```bash
figma-dump-tokens | npx tokens-bruecke --input - --stdout --quiet > tokens.json
```

Snapshot mode ignores `FIGMA_API_KEY` / `FIGMA_FILE_KEY` env vars. Passing `--api-key`, `--oauth-token` or `--file-key` explicitly alongside `--input` is an error. Every other flag (`--config`, `--split-by-collection`, `--split-by-mode`, `--omit-collection-names`, `--stdout`) works identically in both modes, and the output is byte-for-byte the same shape.

### Snapshot shape

Objects use the **raw Figma Plugin API shapes, verbatim** — serialize what the API returns, do not reshape it. Full contract: [schemas/tokens-snapshot.schema.json](../../schemas/tokens-snapshot.schema.json). Ready-to-copy example: [examples/tokens-snapshot.json](../../examples/tokens-snapshot.json).

```json
{
  "variableCollections": [
    {
      "id": "VariableCollectionId:1:1",
      "name": "Primitives",
      "defaultModeId": "1:0",
      "modes": [{ "modeId": "1:0", "name": "Value" }],
      "variableIds": ["VariableID:1:2"]
    }
  ],
  "variables": [
    {
      "id": "VariableID:1:2",
      "name": "colors/blue/500",
      "variableCollectionId": "VariableCollectionId:1:1",
      "resolvedType": "COLOR",
      "scopes": ["ALL_SCOPES"],
      "valuesByMode": { "1:0": { "r": 0.2, "g": 0.4, "b": 1, "a": 1 } }
    }
  ],
  "paintStyles": [],
  "textStyles": [],
  "effectStyles": [],
  "gridStyles": []
}
```

Building the snapshot from inside a Figma plugin:

```js
const snapshot = {
  variableCollections: await figma.variables.getLocalVariableCollectionsAsync(),
  variables: await figma.variables.getLocalVariablesAsync(),
  paintStyles: await figma.getLocalPaintStylesAsync(),
  textStyles: await figma.getLocalTextStylesAsync(),
  effectStyles: await figma.getLocalEffectStylesAsync(),
  gridStyles: await figma.getLocalGridStylesAsync(),
};
```

Plugin API objects are live proxies, so `JSON.stringify` may not enumerate their properties — copy the fields listed in the schema onto plain objects before serializing.

Rules that matter:

- `variables` and `variableCollections` are **required**; the four style arrays are optional and only read when the matching `includedStyles.*.isIncluded` config flag is on.
- `valuesByMode` is keyed by **`modeId`**, not by mode name. Mode names come from the collection's `modes` array.
- Aliases are `{ "type": "VARIABLE_ALIAS", "id": "<variable id>" }`. The target variable must be present in the snapshot, otherwise the value exports as `"#missing#"` — the same behaviour as the REST resolver. Library (remote) variables are not resolvable today; include them in `variables` if you need them aliased.
- Color aliases with their own opacity (Figma "Control opacity at scale") are `{ "type": "VARIABLE_EXPRESSION", "expressionFunction": "COMPOSE_COLOR", "expressionArguments": [<alias or rgba>, <0..100 or alias>] }`. Pass them through verbatim; they export as `{ "components": "{path.to.color}", "alpha": 0.5 }` (or a reference in `alpha`).
- `collection.variableIds` preserves Figma's Variables-panel ordering in the output. Without it, output order follows the `variables` array.
- Colors are 0..1 float channels (`{ r, g, b, a }`), as the Plugin API returns them — not 0..255 and not hex.
- Filter out remote (library) variables and collections, matching what the REST resolver does.

## Config file

Optional JSON file passed via `--config`. Schema: [schemas/cli-options.schema.json](../../schemas/cli-options.schema.json). Example: [examples/cli-options.json](../../examples/cli-options.json).

Key options (all optional): `includedStyles` (include text/effects/grids/colors styles, default all excluded), `useDTCG` (default `true`, DTCG 2025.10 `$`-keys), `colorMode` (`hex` default; also `rgba-object`, `rgba-css`, `srgb-dtcg`, `hsla-object`, `hsla-css`, `hsl-dtcg`, `oklch-dtcg`), `includeScopes`, `includeFigmaMetaData`, `usePercentageOpacity`, `expandEasingPresets` (default `true`, expands Figma's named easing presets into `cubicBezier` values), `storeStyleInCollection`, `splitByCollection`, `splitByMode`, `omitCollectionNames`.

## Output

- Default: single pretty-printed JSON file at `--output` (directories auto-created); top-level groups are collection names.
- `--split-by-collection`: `{output}/{Collection}.tokens.json` per collection.
- `--split-by-mode`: `{output}/{Collection}/{Mode}.tokens.json` (unsafe filename chars replaced with `-`).
- `--stdout`: pure JSON on stdout; all logs on stderr, safe to pipe.
- Format is DTCG only. To convert to CSS/platform outputs, feed the JSON to Style Dictionary or Terrazzo.

## Errors & exit codes

- Exit `0` on success, `1` on any failure (bad config file, API error, write error).
- `403` → Enterprise plan or `file_variables:read` scope missing.
- `404` → wrong `--file-key` or the token has no access to the file.
- Validation errors (missing/conflicting flags) are printed by yargs with usage help.
- Snapshot mode: unreadable `--input` file or a snapshot failing validation exits `1`, naming the offending key (e.g. `variables[3] is missing a string "variableCollectionId"`).
