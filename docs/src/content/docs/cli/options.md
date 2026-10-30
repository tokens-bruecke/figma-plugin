---
title: "Options and configuration"
description: "CLI flags, snapshot input, the configuration file and the update notice."
---

## Options

| Option                    | Alias | Description                                                                                                  | Required                                                |
| ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `--api-key`               | `-a`  | Figma personal access token (PAT)                                                                            | One of `--api-key` or `--oauth-token`, unless `--input` |
| `--oauth-token`           | `-t`  | Figma OAuth token                                                                                            | One of `--api-key` or `--oauth-token`, unless `--input` |
| `--file-key`              | `-f`  | Figma file key                                                                                               | Yes, unless `--input` is used                           |
| `--input`                 | `-i`  | Read a local tokens snapshot instead of calling the REST API (`-` reads stdin)                               | No                                                      |
| `--output`                | `-o`  | Path to output file, or output directory when `--split-by-collection` or `--split-by-mode`                   | Yes, unless `--stdout` is used                          |
| `--stdout`                |       | Print tokens JSON to stdout instead of writing a file (mutually exclusive with `--output` and split options) | No                                                      |
| `--config`                | `-c`  | Path to configuration file                                                                                   | No                                                      |
| `--split-by-collection`   | `-s`  | Write each collection as a separate `.tokens.json` file in `--output`                                        | No                                                      |
| `--split-by-mode`         | `-m`  | Write each mode as a separate `.tokens.json` file under its collection directory in `--output`               | No                                                      |
| `--omit-collection-names` |       | Drop top-level collection names and merge all variables into one flat namespace                              | No                                                      |
| `--omit-created-at`       |       | Leave the `createdAt` timestamp out of the metadata, so an unchanged file exports to identical output        | No                                                      |
| `--quiet`                 | `-q`  | Suppress progress logs (errors are still printed)                                                            | No                                                      |
| `--help`                  | `-h`  | Show usage help                                                                                              | No                                                      |
| `--version`               |       | Show the CLI version                                                                                         | No                                                      |

Progress logs are printed to **stderr**, so stdout stays clean for piping:

```bash
tokens-bruecke -a $FIGMA_TOKEN -f $FIGMA_FILE --stdout --quiet | jq .
```

Every option can also be set via a `FIGMA_`-prefixed environment variable — `FIGMA_API_KEY`, `FIGMA_OAUTH_TOKEN`, `FIGMA_FILE_KEY`, `FIGMA_OUTPUT`, etc. Explicit flags override environment variables:

```bash
export FIGMA_API_KEY=<your-token>
tokens-bruecke -f $FIGMA_FILE -o out/tokens.json
```

:::tip
For automated pipelines, `--oauth-token` is preferred over `--api-key`. Personal Access Tokens expire every 90 days and require manual renewal, while OAuth tokens support programmatic refresh for indefinite access.
:::

Other export settings are available through a JSON configuration file (see [CLI Configuration File](#cli-configuration-file) below).

The REST API returns variables, collections and styles in no fixed order, so the CLI sorts them by name in REST mode. Exporting an unchanged file then gives the same output every time, as long as you also pass `--omit-created-at`. This order is alphabetical rather than the order of Figma's Variables panel, which the plugin and snapshot mode keep.

In REST mode the CLI exports the file's own styles, published or not, the same set the plugin exports. This also works for a branch, which can't publish styles. Styles that come from a library are left out, as in the plugin.

The REST API reports letter spacing in pixels only, so a text style with percentage letter spacing exports as `{ "value": -0.32, "unit": "px" }` in REST mode, where the plugin writes `"-2%"`. Snapshot mode keeps the plugin's unit.

## Snapshot input

`--input <path>` transforms a local JSON snapshot of a Figma file's variables and styles instead of calling the REST API. `--input -` reads stdin, so it composes with anything that can dump the data:

```bash
# From a file
tokens-bruecke --input snapshot.json --output out/tokens.json

# From a pipe
my-figma-dumper | tokens-bruecke --input - --stdout --quiet > tokens.json
```

This is the path for **agents and plugins running inside Figma**: they already have Plugin API access to the open file, so they can dump the local variables and styles and pipe them straight through — no personal access token, and no Enterprise plan.

Snapshot mode ignores the `FIGMA_API_KEY` / `FIGMA_FILE_KEY` environment variables. Passing `--api-key`, `--oauth-token` or `--file-key` explicitly alongside `--input` is an error. Everything else — `--config`, `--split-by-collection`, `--split-by-mode`, `--omit-collection-names`, `--stdout` — behaves exactly as it does in REST mode.

### Snapshot shape

Objects use the **raw Figma Plugin API shapes, verbatim** — serialize what the API returns rather than reshaping it, so nothing is lost in translation:

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

Only `variables` and `variableCollections` are required; the style arrays are optional and read only when the matching `includedStyles.*` config flag is on. The full contract is in [schemas/tokens-snapshot.schema.json](https://github.com/tokens-bruecke/figma-plugin/blob/main/schemas/tokens-snapshot.schema.json), with a ready-to-copy example in [examples/tokens-snapshot.json](https://github.com/tokens-bruecke/figma-plugin/blob/main/examples/tokens-snapshot.json).

Things worth knowing when building a snapshot:

- `valuesByMode` is keyed by **`modeId`**, not mode name — names come from the collection's `modes` array.
- Colors are 0..1 float channels (`{ r, g, b, a }`), as the Plugin API returns them.
- `collection.variableIds` preserves the ordering shown in Figma's Variables panel.
- [Extended collections](../../reference/token-structure/#extended-collections) need `isExtension`, `parentVariableCollectionId`, `variableOverrides`, `modes[].parentModeId` and `variableIds`. Their variables belong to the root collection, so `variableIds` is the only list of what they contain: without it the extension exports as an empty group.
- Aliases are `{ "type": "VARIABLE_ALIAS", "id": "…" }` and must point at a variable present in the snapshot; otherwise the value exports as `"#missing#"`, matching the REST behaviour for unresolvable references.
- Color aliases with their own opacity come back from the Plugin API as `{ "color": <alias or rgba>, "opacity": <0..100 or alias> }` (older Figma Desktop builds used `{ "type": "VARIABLE_EXPRESSION", "expressionFunction": "COMPOSE_COLOR", "expressionArguments": [<alias or rgba>, <0..100 or alias>] }`) — pass either through as-is, see [Color aliases with opacity](../../reference/aliases/#color-aliases-with-opacity).

:::note
Plugin API objects are live proxies, so `JSON.stringify` may not enumerate their properties. Copy the fields listed in the schema onto plain objects before serializing.
:::

## CLI Configuration File

You can use a JSON configuration file to specify the export options for the CLI. Run [`tokens-bruecke init`](../overview/#quick-setup) to generate one, or write it by hand:

```json
{
  "includedStyles": {
    "text": { "isIncluded": true, "customName": "typography" },
    "effects": { "isIncluded": false, "customName": "effects" },
    "grids": { "isIncluded": false, "customName": "grids" },
    "colors": { "isIncluded": false, "customName": "colors" }
  },
  "includeScopes": true,
  "useDTCG": true, // DTCG 2025.10 format: $-prefixed keys, dimension objects, spec-valid types
  "includeValueStringKeyToAlias": true,
  "includeFigmaMetaData": false, // Add $extensions.figma (variableId, codeSyntax, collection) to variables
  "usePercentageOpacity": false, // Export opacity as percentage (10%) instead of decimal (0.1)
  "expandEasingPresets": true, // Expand Figma's named easing presets into cubicBezier values
  "colorMode": "hex", // "hex"  | "rgba-object"  | "srgb-dtcg" |  "rgba-css"  | "hsla-object" | "hsl-dtcg" | "hsla-css" | "oklch-dtcg";
  "storeStyleInCollection": "none", // Name of one of your collection or "none" to keep them separated
  "splitByCollection": false, // Write each collection as a separate .tokens.json file
  "splitByMode": false, // Write each mode as a separate .tokens.json file under its collection directory
  "omitCollectionNames": false, // Drop top-level collection names and merge all variables into one flat namespace
  "omitCreatedAt": false // Leave the createdAt timestamp out of the metadata
}
```

Save this JSON file and pass it to the CLI using the `--config` option. A JSON schema with all options, types and defaults is available at [schemas/cli-options.schema.json](https://github.com/tokens-bruecke/figma-plugin/blob/main/schemas/cli-options.schema.json) — reference it via a `$schema` key for editor validation and autocompletion (see [examples/cli-options.json](https://github.com/tokens-bruecke/figma-plugin/blob/main/examples/cli-options.json)).

:::note
Explicit CLI flags (e.g. `--split-by-collection`) override values from the config file, which override the defaults.
:::

Each style type in `includedStyles` is merged with its default, so `"text": { "isIncluded": true }` is enough: the group keeps its default name (`Typography-styles`) and the other style types stay excluded.

## Update notice

The CLI checks npm at most once a day for a newer version. When there is one, it prints a single line to stderr after the export, even with `--quiet`:

```
ℹ️  tokens-bruecke 3.20.0 is available (you ran 3.19.0). Use the latest version with: npx tokens-bruecke@latest
```

It only asks npm for the version number — no tokens, file keys or config are sent — and it never installs anything. The check runs alongside the export with a 1.5s timeout, says nothing when offline, and caches the result in `~/.cache/tokens-bruecke` (or `$XDG_CACHE_HOME`). It is skipped when `CI` is set; set `TOKENS_BRUECKE_NO_UPDATE_CHECK=1` or `NO_UPDATE_NOTIFIER=1` to turn it off elsewhere.
