---
name: tokens-bruecke
description: Export Figma variables and styles as DTCG design tokens JSON via the tokens-bruecke CLI. Use when exporting design tokens from Figma, syncing Figma variables to a codebase, fetching Figma color/typography/spacing tokens, or automating design-token pipelines in CI.
---

# tokens-bruecke CLI

Exports Figma variables (and optionally text/color/effect/grid styles) as [DTCG](https://tr.designtokens.org/format/) design tokens JSON.

## Requirements

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

All flags can be set via `FIGMA_`-prefixed env vars: `FIGMA_API_KEY`, `FIGMA_OAUTH_TOKEN`, `FIGMA_FILE_KEY`, `FIGMA_OUTPUT`, etc. Explicit flags override env vars.

The file key is the segment after `figma.com/design/` in a Figma file URL.

## Flags

| Flag                      | Alias | Description                                                                     |
| ------------------------- | ----- | ------------------------------------------------------------------------------- |
| `--api-key`               | `-a`  | Figma personal access token (one of api-key/oauth-token required)               |
| `--oauth-token`           | `-t`  | Figma OAuth token                                                               |
| `--file-key`              | `-f`  | Figma file key (required)                                                       |
| `--output`                | `-o`  | Output file path, or directory when splitting (required unless `--stdout`)      |
| `--stdout`                |       | Print tokens JSON to stdout; mutually exclusive with `--output` and split flags |
| `--config`                | `-c`  | Path to a JSON config file (see below)                                          |
| `--split-by-collection`   | `-s`  | One `{Collection}.tokens.json` file per collection in the output dir            |
| `--split-by-mode`         | `-m`  | One `{Collection}/{Mode}.tokens.json` file per mode                             |
| `--omit-collection-names` |       | Merge all tokens into a single namespace (drop collection groups)               |
| `--quiet`                 | `-q`  | Suppress progress logs (errors still printed to stderr)                         |
| `--help` / `--version`    | `-h`  | Usage / version                                                                 |

Precedence: explicit CLI flags > `FIGMA_*` env vars > config file > defaults.

## Config file

Optional JSON file passed via `--config`. Schema: [schemas/cli-options.schema.json](../../schemas/cli-options.schema.json). Example: [examples/cli-options.json](../../examples/cli-options.json).

Key options (all optional): `includedStyles` (include text/effects/grids/colors styles, default all excluded), `useDTCG` (default `true`, DTCG 2025.10 `$`-keys), `colorMode` (`hex` default; also `rgba-object`, `rgba-css`, `srgb-dtcg`, `hsla-object`, `hsla-css`, `hsl-dtcg`, `oklch-dtcg`), `includeScopes`, `includeFigmaMetaData`, `usePercentageOpacity`, `storeStyleInCollection`, `splitByCollection`, `splitByMode`, `omitCollectionNames`.

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
