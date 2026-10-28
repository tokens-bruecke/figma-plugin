---
title: "CLI overview"
description: "Export tokens from the Figma REST API or a local snapshot with the tokens-bruecke CLI."
---

The CLI is published on npm: [tokens-bruecke](https://www.npmjs.com/package/tokens-bruecke)

The CLI can get its data two ways:

- **From the Figma REST API** — pass `--file-key` and a token. Requires a Figma Enterprise plan.
- **From a local snapshot** — pass `--input`. No token, no Enterprise plan; see [Snapshot input](../options/#snapshot-input).

Both modes produce identical output and share every other flag.

:::caution
You need a Figma Enterprise plan to use the Figma REST API for variables. Use `--input` if you don't have one.
:::

## Installation

To install the CLI globally, run:

```bash
pnpm add -g tokens-bruecke
#or npm install -g tokens-bruecke
```

This will make the `tokens-bruecke` command available globally on your system.

## Usage

After installation, you can run the CLI tool using:

```bash
tokens-bruecke [options]
```

For example:

```bash
# Using a Personal Access Token (PAT)
tokens-bruecke --api-key $FIGMA_TOKEN --file-key $FIGMA_FILE --config config.json --output out/tokens.json

# Using an OAuth token
tokens-bruecke --oauth-token $FIGMA_OAUTH_TOKEN --file-key $FIGMA_FILE --config config.json --output out/tokens.json

# From a local snapshot — no token required
tokens-bruecke --input snapshot.json --output out/tokens.json
```

This will fetch figma variables and export them in `out/tokens.json`

## Quick setup

`tokens-bruecke init` asks a few questions and writes a config file you can commit:

```bash
tokens-bruecke init
```

```
? Color mode (↑↓ to move, enter to select)
❯ HEX          "#3366ff"
  RGBA CSS     "rgba(51, 102, 255, 1)"
  RGBA Object  { r, g, b, a }
  sRGB DTCG    DTCG color object
  HSLA CSS     "hsla(225, 100%, 60%, 1)"
  HSLA Object  { h, s, l, a }
  HSL DTCG     DTCG color object
  OKLCH DTCG   DTCG color object

? Styles to include (space to toggle, a for all, enter to confirm)
❯ ◉ Color styles
  ◯ Typography styles
  ◉ Effect styles
  ◯ Grid styles
```

Each answered question collapses to a single line, so you end up with a short summary rather than a wall of text:

```
? Color mode › OKLCH DTCG
? Styles to include › Color styles, Effect styles
? Use DTCG 2025.10 format? › No
? Output layout › One file per collection

✨ Created tokens-bruecke.config.json
```

**Keys:** `↑`/`↓` (or `j`/`k`, or `Tab`) to move, `1`–`9` to jump straight to a row, `Space` to toggle in multi-select, `a` to toggle all, `Enter` to confirm, `Ctrl+C` / `Esc` to cancel without writing anything. Selection wraps at both ends. Set `NO_COLOR=1` to drop the colour codes.

The four questions cover the settings people change most often, but the generated file contains **every** option with its default, plus a `$schema` link — so your editor autocompletes and documents the rest as you edit it.

| Option    | Alias | Description                                               |
| --------- | ----- | --------------------------------------------------------- |
| `--yes`   | `-y`  | Skip the questions and write the default config           |
| `--force` |       | Overwrite an existing config file                         |
| `--path`  | `-p`  | Where to write it (default: `tokens-bruecke.config.json`) |

When stdin or stdout is not a terminal — CI, a pipe, an agent — `init` skips the questions and writes the defaults instead of hanging. It refuses to overwrite an existing config (exit `1`) unless you pass `--force`, and cancelling the questions exits `130` without writing anything.

The export never picks up `tokens-bruecke.config.json` on its own: pass it with `-c`.
