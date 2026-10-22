# CLI and library API

The user-facing reference is [skills/tokens-bruecke/SKILL.md](../../skills/tokens-bruecke/SKILL.md) and the README section "Use as cli tool". This file covers the implementation.

## CLI (src/cli/)

| File                    | Role                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/cli.ts`            | shebang + `import './cli/index'`                                                                                                     |
| `index.ts`              | yargs definition, validation, config loading, resolver choice, writing output, update notice                                         |
| `options.ts`            | `resolveExportOptions(config, overrides)`, `getStdoutSplitConflict`                                                                  |
| `defaults.ts`           | `defaultConfig: ExportSettingsI`, `CONFIG_SCHEMA_URL`, `DEFAULT_CONFIG_FILENAME = 'tokens-bruecke.config.json'`                      |
| `restApiResolver.ts`    | `RestAPIResolver` + pure helpers (`normalizeLocalVariables`, `sortCollections`, `restVariablesToSnapshot`, `restLayoutGridToPlugin`) |
| `fileResolver.ts`       | `parseSnapshot` / `validateSnapshot` + `FileResolver`                                                                                |
| `init.ts` / `prompt.ts` | the `init` subcommand: questions → `buildConfig` → write file; a raw-mode keyboard prompt with a readline fallback                   |
| `updateCheck.ts`        | a once-a-day npm registry check, cached in `$XDG_CACHE_HOME/tokens-bruecke/update-check.json`                                        |
| `logger.ts`             | `log` (stderr, muted by `--quiet`), `silentLog`                                                                                      |

### Options precedence

`explicit flag > FIGMA_* env var > config file (-c) > defaultConfig`

- yargs `.env('FIGMA')` maps every option to `FIGMA_<OPTION>` (`FIGMA_API_KEY`, `FIGMA_FILE_KEY`, `FIGMA_OUTPUT`, `FIGMA_SPLIT_BY_MODE`, …).
- Only four export settings are flags: `--split-by-collection`, `--split-by-mode`, `--omit-collection-names` and `--omit-created-at`. They are passed to `resolveExportOptions` as `CliOverrides`. Every other setting comes only from the config file.
- `resolveExportOptions` spreads `defaultConfig`, then the config, then merges each `includedStyles` entry with its default, maps the legacy `useDTCGKeys` → `useDTCG`, and applies the overrides. **The config file is not validated against the schema**, so unknown keys pass through silently.
- The config file is never loaded automatically. Users must pass `-c`.

### Validation (yargs `.check`)

- `--input` and any explicit `--api-key/-a`, `--oauth-token/-t`, `--file-key/-f` → error. Env vars are ignored in snapshot mode: `argv.input` decides the resolver.
- Without `--input`, a token (PAT or OAuth) and a file key are required.
- Exactly one of `--output` / `--stdout`. `--stdout` with a split flag is an error, and `getStdoutSplitConflict` catches splits that come from the config file.
- `init` skips all export checks (`isInitCommand = argv[2] === 'init'`). Export options are declared with `global: false` so they don't show in `init --help`.

### Exit codes

`0` success · `1` any error (bad config, snapshot, API, write, `init` on an existing file without `--force`) · `130` `init` cancelled.

### RestAPIResolver: REST → Plugin API shapes

Uses `figma-api` (`Api`, axios-based). OAuth wins over a PAT when both are set.

| Data                      | Endpoint                                               | Reshaping                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Variables and collections | `GET /v1/files/:key/variables/local` (Enterprise only) | `normalizeLocalVariables`: drops `remote` variables and collections, `deletedButReferenced` variables and `hiddenFromPublishing` collections; on FLOAT variables, `FONT_STYLE` scope → `FONT_WEIGHT`. Sorted by name, then id; `variableIds` sorted too. Fetched once (cached promise).                                                                                                                                     |
| Style list                | `GET /v1/files/:key?depth=2` → `styles` map            | only `!remote` styles (published or not; works for branches). `depth=1` would return an empty map.                                                                                                                                                                                                                                                                                                                          |
| Style nodes               | `GET /v1/files/:key/nodes?ids=…` per style type        | skipped when there are no ids (the endpoint returns 400 on empty `ids`). Converted by `textNodeToStyle` (bound-variable arrays → single alias, only text-style fields), `rectangleNodeToPaint` (per-paint `boundVariables.color` → `boundVariables.paints[]`), `rectangleNodeToEffectStyle` and `frameNodeToGrid` (`restLayoutGridToPlugin`: `count -1` → `Infinity`, field pruning by alignment, `numSections` → `count`). |

Every REST quirk is fixed in this resolver so `src/common` sees only Plugin API data. Tests: `restApiResolver.spec.ts`.

### FileResolver: snapshot input

- `parseSnapshot(raw, source)` parses JSON; `validateSnapshot` requires `variables[]` and `variableCollections[]`, checks the optional style arrays, `id`/`name`/`modes` on collections and `id`/`name`/`variableCollectionId`/`valuesByMode` on variables. Error messages name the offending index and key (e.g. `variables[3] is missing a string "variableCollectionId"`), so an agent can fix its dump.
- A missing `scopes` becomes `[]`. Nothing else is filtered: snapshot mode exports whatever is in the snapshot.
- Contract: [schemas/tokens-snapshot.schema.json](../../schemas/tokens-snapshot.schema.json). Example: [examples/tokens-snapshot.json](../../examples/tokens-snapshot.json), which `fileResolver.spec.ts` and `api/index.spec.ts` load, so keep it valid.

### Output

`--stdout` → `JSON.stringify(tokens, null, 2) + '\n'`. Otherwise `splitTokensIntoFiles(tokens, { …, targetIsFolder: split }, argv.output)`, then `mkdirSync(dirname, { recursive: true })` and `writeFileSync` for each file.

### Update check

`checkForUpdate(version)` starts in parallel with the export (1.5 s timeout, cached for 24 h) and is printed to stderr after it, even with `--quiet`. It is off when `CI`, `NO_UPDATE_NOTIFIER` or `TOKENS_BRUECKE_NO_UPDATE_CHECK` is set (`'0'`/`'false'` count as unset). Only a strict `x.y.z` version from the registry is ever printed.

## Library API (src/api/index.ts + api.d.ts)

```ts
fetchTokens({ fileKey, personalAccessToken?, oauthToken?, options? }): Promise<TokenTree>
convertTokens(input: TokensSnapshot | LocalVariablesResponse, options?): Promise<TokenTree>
class TokensBrueckeError extends Error { code; cause? }
```

- `options` is `ExportOptions` (all optional), resolved with the same `resolveExportOptions(options, {})` as the CLI, so the output is identical.
- `convertTokens` detects a REST response by its `meta` key → `restVariablesToSnapshot` (same filtering and sorting as `RestAPIResolver`). That input has no styles, so any `includedStyles.*.isIncluded` → `INVALID_ARGUMENT`.
- Error mapping: missing args → `INVALID_ARGUMENT`; snapshot or REST shape → `INVALID_SNAPSHOT`; axios errors → `FIGMA_FORBIDDEN` (403), `FIGMA_NOT_FOUND` (404), `FIGMA_RATE_LIMITED` (429), `FIGMA_REQUEST_FAILED`; anything else during conversion → `CONVERSION_FAILED`. The original error is in `cause`.
- Uses `silentLog` and never touches `process` or the file system. The core's `console.warn` calls (skipped variables, `#missing#` aliases, collisions) still go to stderr (see known-issues.md).
- **Type contract:** [api.d.ts](../../api.d.ts) is hand-written, self-contained and shipped as is. `src/api/index.ts` imports its types, and the `exportOptionsMatchSettings` compile-time check fails if `ExportOptions` and `ExportSettingsI` have different keys.
- Built twice (CJS `bin/api.js` and ESM `bin/api.mjs`). Each build has its own `TokensBrueckeError` class, so consumers should check `error.code` rather than `instanceof`.

## Agent-facing docs shipped with the package

| File                                  | Audience                                                         | Update when                                                                |
| ------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `llms.txt`                            | LLM tools discovering the CLI                                    | CLI usage, flags or modes change                                           |
| `skills/tokens-bruecke/SKILL.md`      | agents _using_ the CLI (frontmatter `name`/`description` + body) | any flag, config option, output layout, exit code or snapshot rule changes |
| `schemas/cli-options.schema.json`     | editors, agents writing configs                                  | an export option is added, changed or removed                              |
| `schemas/tokens-snapshot.schema.json` | agents dumping snapshots                                         | the shape the transforms read changes                                      |

These are product docs for users of the CLI. The files in `docs/agents/` are for developing this repo and aren't shipped.
