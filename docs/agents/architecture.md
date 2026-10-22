# Architecture

How the pieces fit together. Start with [AGENTS.md](../../AGENTS.md); this file goes one level deeper.

## One core, four hosts

```
                         ┌──────────────────────────────────────────┐
                         │            src/common (core)             │
                         │                                          │
                         │  getTokens(resolver, settings)           │
                         │    ├─ variablesToTokens                  │
                         │    ├─ stylesToTokens                     │
                         │    ├─ mergeStylesIntoTokens              │
                         │    └─ split by mode / collection + meta  │
                         │                                          │
                         │  splitTokensIntoFiles(tree) → files      │
                         │  tokensToVariables(json)  (import, figma)│
                         └──────────────▲───────────────────────────┘
                                        │ IResolver (8 async methods + warn?)
       ┌─────────────────────┬──────────┴──────────┬────────────────────────┐
       │                     │                     │                        │
 PluginAPIResolver     RestAPIResolver        FileResolver            createExtensionResolver
 (src/app/api)         (src/cli)              (src/cli)               (wraps any resolver for
 figma.variables.*     Figma REST API via     snapshot JSON in the    extended collections)
 figma.getLocal*Async  `figma-api` (axios)    Plugin API shapes
       │                     │                     │
 Figma plugin          CLI --file-key          CLI --input
 controller            API fetchTokens()       API convertTokens()
```

`IResolver` ([src/common/resolver.ts](../../src/common/resolver.ts)):

```ts
getLocalVariableCollections(): Promise<VariableCollection[]>
getLocalVariables(): Promise<Variable[]>
getLocalPaintStyles() / getLocalTextStyles() / getLocalEffectStyles() / getLocalGridStyles()
getVariableById(id): Promise<Variable | null>            // alias resolution
getVariableCollectionById(id): Promise<VariableCollection | null>
warn?(message): void                                     // optional: receives warnings, else console.warn
```

Every resolver returns **Plugin API object shapes** (the `@figma/plugin-typings` types). The REST resolver converts REST nodes into those shapes, so the transform code has a single data model.

## The Figma plugin: two runtimes

|        | Controller (sandbox)                                                                          | UI (iframe)                                                                   |
| ------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Source | `src/app/controller/index.ts`                                                                 | `src/app/index.tsx` → `container.tsx`                                         |
| Output | `code.js`                                                                                     | `ui.html` (webpack inlines JS + CSS)                                          |
| Has    | `figma.*`, `figma.clientStorage`, `__html__`                                                  | DOM, `fetch`, `Blob`, file input, React                                       |
| Does   | builds tokens (`getTokens`), imports (`tokensToVariables`), stores config, resizes the window | renders settings, previews JSON, downloads/zips, pushes to servers, analytics |

The plugin runs in two editors, read from `figma.editorType` at startup and sent to the UI as `pluginEnvironment`:

- **Figma Design** (`'figma'`): a floating window that the controller sizes with `figma.ui.resize`. Everything works, including the import.
- **Dev Mode** (`'dev'`, `figma.mode === 'inspect'`), also in Figma for VS Code (`figma.vscode` is set): the iframe fills the Inspect panel and the user sizes it, so `resizeUI` is a no-op. The document is read-only for every plugin, even with edit access; only pluginData, relaunchData and `exportAsync` may write. So the UI hides the import, and the controller rejects `importTokens`. In VS Code, links must open through `figma.openExternal`.

They talk only through `figma.ui.postMessage` ⇄ `parent.postMessage({ pluginMessage }, '*')`. The full protocol is in [plugin-ui.md](plugin-ui.md#message-protocol).

Typical export ("Download JSON"):

```
UI  SettingsView.getTokensForDownload
      → postMessage { type: 'getTokens', role: 'download' }
Controller  getTokens(new PluginAPIResolver(), activeProfile)
      → postMessage { type: 'setTokens', tokens, role: 'download' }
UI  downloadTokensFile(tokens, splitByCollection, splitByMode)
      → splitTokensIntoFiles → one .json, or design.tokens.zip (JSZip)
```

Push and preview work the same way with `role: 'push'` (plus a `server[]` list) or `role: 'preview'`.

## The CLI

```
src/cli.ts (shebang) → src/cli/index.ts
  yargs: flags + FIGMA_* env vars + validation (.check)
  read --config JSON → resolveExportOptions(config, flagOverrides)   (options.ts, defaults.ts)
  resolver = --input ? FileResolver(parseSnapshot(file|stdin)) : RestAPIResolver(fileKey, pat, oauth)
  tokens = getTokens(resolver, options)
  --stdout → JSON to stdout   |   else splitTokensIntoFiles(..., targetIsFolder) → fs writes
  checkForUpdate() runs in parallel; notice to stderr afterwards
`init` subcommand → src/cli/init.ts (interactive prompt in prompt.ts, or -y defaults)
```

Details: [cli-and-api.md](cli-and-api.md).

## The library API

`src/api/index.ts` exposes `fetchTokens` (REST) and `convertTokens` (snapshot, or a raw REST `/variables/local` response). It reuses the CLI resolvers and `resolveExportOptions` with `silentLog`, and maps failures to `TokensBrueckeError` codes. Public types are hand-written in root [api.d.ts](../../api.d.ts) and imported by the implementation, so drift is a compile error.

## Build

| Config                                               | Entries                               | Output                                         | Notes                                                                                                                                                                                              |
| ---------------------------------------------------- | ------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [webpack.config.js](../../webpack.config.js)         | `ui` (index.tsx), `code` (controller) | `dist/figma-plugin/` + `dist/figma-plugin.zip` | ts-loader with `tsconfig.plugin.json`; SCSS modules; HtmlInlineScript/CSS plugins inline everything into `ui.html`; copies `manifest.json`. Dev mode: `inline-source-map` (Figma's eval needs it). |
| [webpack.config.cli.js](../../webpack.config.cli.js) | `cli`, `api` (CJS) + `api` (ESM)      | `bin/cli.js`, `bin/api.js`, `bin/api.mjs`      | ts-loader with `tsconfig.cli.json`; `target: node`; `yargs`/`react` are externals; BannerPlugin re-adds the shebang to `cli.js` only.                                                              |

TypeScript projects: `tsconfig.plugin.json` (includes all `src/**` except `src/cli`, JSX, DOM lib) and `tsconfig.cli.json` (api, cli, common; excludes `src/app`). `tsconfig.json` only references both. Webpack's `process.env.NODE_ENV` is what turns analytics on in production builds.

`bin/` and `dist/` are git-ignored build outputs. Never edit them.

### What ships where

- **npm package `tokens-bruecke`** (`files` in package.json): `bin/`, `api.d.ts`, `schemas/`, `skills/`, two example files, `llms.txt`, `manifest.json`, the three `.d.ts` files, README, LICENSE, CHANGELOG. `src/` and `docs/` are not shipped. `exports` maps `.` → CLI, `./api` → typed CJS/ESM API, plus `./schemas/*`, `./skills/*`, `./examples/*`.
- **Figma plugin**: `dist/figma-plugin/` (`manifest.json`, `code.js`, `ui.html`), zipped as `dist/figma-plugin.zip` and attached to the GitHub release.

## manifest.json

```json
{
  "id": "1254538877056388290",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma", "dev"],
  "capabilities": ["inspect", "vscode"],
  "documentAccess": "dynamic-page",
  "networkAccess": { "allowedDomains": ["*"], "reasoning": "…custom URL…" }
}
```

- `main`/`ui` are relative to the manifest, so load **`dist/figma-plugin/manifest.json`** in Figma, not the root one (the root copy has no `code.js` next to it).
- `dynamic-page` → async Plugin APIs only.
- `editorType` `dev` with `capabilities: ["inspect"]` makes it an Inspect panel plugin in Dev Mode; `vscode` also allows it in Figma for VS Code. Don't add anything to the controller that writes to the document outside the import, or it fails in Dev Mode.
- `allowedDomains: ["*"]` exists because of the custom-URL push target. If you add a fixed endpoint, nothing needs to change here.

## Release pipeline

1. A feature or fix PR to `main` with Conventional Commit messages; CI runs build and tests.
2. A `chore: release vX.Y.Z` PR changes only `package.json#version`.
3. Pushing tag `vX.Y.Z` runs `release.yml`: `pnpm install` → `pnpm run build` → `npm publish --provenance --access public` (trusted publishing over OIDC, no token) → `gh release create` with `dist/figma-plugin.zip` → `conventional-changelog` regenerates CHANGELOG.md, runs prettier and commits it to `main`.
4. Updating the Figma Community listing is done by hand, outside this repo.

The plugin version shown in the UI footer comes from `package.json` (`SettingsView` imports `@root/package.json`), so it changes with the release bump.
