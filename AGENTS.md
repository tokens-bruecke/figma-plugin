# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, Copilot, Gemini, …) working on this repository. Human contributors: see [CONTRIBUTING.md](CONTRIBUTING.md). End-user docs: [README.md](README.md).

## What this repository is

**TokensBruecke** converts Figma variables (and optionally text, color, effect and grid styles) into [DTCG 2025.10](https://www.designtokens.org/tr/2025.10/format/) design-token JSON, and imports such JSON back into Figma variables. One TypeScript codebase ships **three products** that share one transform core:

| Product                              | Entry point                                | Build output                                     | Runs in                                      |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------------ | -------------------------------------------- |
| Figma plugin, sandbox ("controller") | `src/app/controller/index.ts`              | `dist/figma-plugin/code.js`                      | Figma plugin sandbox (`figma.*` API, no DOM) |
| Figma plugin, UI                     | `src/app/index.tsx`                        | `dist/figma-plugin/ui.html` (JS and CSS inlined) | iframe (React 18, DOM, network)              |
| CLI `tokens-bruecke`                 | `src/cli.ts` → `src/cli/index.ts`          | `bin/cli.js`                                     | Node.js                                      |
| Library `tokens-bruecke/api`         | `src/api/index.ts` (+ types in `api.d.ts`) | `bin/api.js`, `bin/api.mjs`                      | Node.js                                      |

All four read Figma data through one interface, `IResolver` ([src/common/resolver.ts](src/common/resolver.ts)), and call the same `getTokens()` ([src/common/export.ts](src/common/export.ts)). **The same input and settings must give byte-identical output in plugin, CLI and API.** That is the central invariant of the project.

## Commands

Package manager: **pnpm** (`packageManager: pnpm@9.11.0`). Node: CI uses `lts/*`.

| Task                      | Command                                                                  | Notes                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Install                   | `pnpm install`                                                           |                                                                                                                                             |
| Run all tests once        | `pnpm test -- --run` or `npx vitest run`                                 | ⚠️ Plain `pnpm test` starts vitest in **watch mode** in a TTY and never exits.                                                              |
| Run one test file         | `npx vitest run src/common/transform/motion.spec.ts`                     |                                                                                                                                             |
| Run tests by name         | `npx vitest run -t "composed colors"`                                    |                                                                                                                                             |
| Build everything          | `pnpm run build`                                                         | `build:cli` (→ `bin/`) then `build:plugin` (→ `dist/`). About 10 s.                                                                         |
| Plugin dev build (watch)  | `pnpm dev`                                                               | Webpack watch with inline source maps; only the plugin, not the CLI.                                                                        |
| Type-check CLI/API/common | `npx tsc -p tsconfig.cli.json --noEmit`                                  | Must be clean.                                                                                                                              |
| Type-check plugin         | `npx tsc -p tsconfig.plugin.json --noEmit --skipLibCheck`                | Without `--skipLibCheck` you get 10 errors from conflicting DOM and Figma typings in `node_modules`. They are pre-existing, so ignore them. |
| Format                    | `npx prettier --write <files>`                                           | Uses `.prettierrc`. Format **only the files you touched**; 7 files are already off-format upstream.                                         |
| Run local CLI build       | `node bin/cli.js --input examples/tokens-snapshot.json --stdout --quiet` | Needs `pnpm run build:cli` first.                                                                                                           |

CI ([.github/workflows/ci.yaml](.github/workflows/ci.yaml)) runs `pnpm run build && pnpm run test`. Before you say a change is done, run **tests (`--run`), both type-checks and the build**.

There is no linter (no ESLint). `tsconfig.base.json` is **not strict** (`strictNullChecks: false`, `noImplicitAny: false`) but has `noUnusedLocals` and `noUnusedParameters`. Prefix intentionally unused parameters with `_`.

## Repository map

```
src/
  common/                  Shared, environment-agnostic core (plugin + CLI + API)
    resolver.ts            IResolver: the only way the core reads Figma data
    export.ts              getTokens(): variables + styles → token tree (+ split by collection/mode, meta)
    transform/             All conversions. See docs/agents/export-pipeline.md
      variablesToTokens.ts     Variables → token tree (ordering, modes, extended collections)
      normalizeValue.ts        One variable value → token value
      normalizeType.ts         Figma type + scopes → token $type
      tokensToVariables.ts     IMPORT: token JSON → Figma variables (plugin only)
      color/ text/ styles/     Color formats, typography helpers, style → token converters
      motion.ts                TIMING/EASING ↔ duration/cubicBezier
      extendedCollections.ts   "Extend a variable collection" support
      splitTokensIntoFiles.ts  Token tree → [{ path, content }] files
  app/                     Figma plugin
    controller/            Sandbox side: message handler, clientStorage, profiles
    api/                   UI side: download, import file picker, analytics; PluginAPIResolver (runs in the controller)
      servers/             Push targets: GitHub, GitHub PR, GitLab, JSONBin, custom URL
    views/ components/     React UI (react-figma-ui components, CodeMirror JSON viewer)
  cli/                     CLI: yargs entry, RestAPIResolver, FileResolver (snapshot), init, update check
  api/                     Library facade: fetchTokens / convertTokens / TokensBrueckeError
global.d.ts                Ambient app types: ExportSettingsI, server credentials, messages, profiles
plugin-types.d.ts          Ambient DTCG token interfaces (ColorTokenI, ShadowTokenI, …)
api.d.ts                   Public, self-contained types of tokens-bruecke/api (shipped as is)
schemas/                   JSON Schemas: CLI config (cli-options) and snapshot input (tokens-snapshot)
examples/                  cli-options.json, tokens-snapshot.json (used by tests!), sample token files
skills/tokens-bruecke/     Agent skill for *using* the CLI (shipped in the npm package)
llms.txt                   LLM entry point for *using* the CLI (shipped in the npm package)
docs/agents/               Deep-dive docs for *developing* this repo (not shipped)
```

Path aliases (tsconfig, webpack and vitest): `@common/*`, `@app/*`, `@cli/*`, `@root/*`. `@utils/*` is declared only in tsconfig and vitest, and `src/utils` does not exist. If you add an alias, add it to all four files: [tsconfig.base.json](tsconfig.base.json), [webpack.config.js](webpack.config.js), [webpack.config.cli.js](webpack.config.cli.js) and [vitest.config.ts](vitest.config.ts).

## Deep-dive docs (read the one that matches your task)

- [docs/agents/architecture.md](docs/agents/architecture.md): runtimes, data flow, resolvers, build and release
- [docs/agents/export-pipeline.md](docs/agents/export-pipeline.md): every rule of Figma → tokens (types, values, aliases, modes, styles, splitting)
- [docs/agents/import-pipeline.md](docs/agents/import-pipeline.md): tokens → Figma variables (three-pass import, type detection, round-trip rules)
- [docs/agents/plugin-ui.md](docs/agents/plugin-ui.md): message protocol, settings and profile storage, views, push servers
- [docs/agents/cli-and-api.md](docs/agents/cli-and-api.md): CLI flags and options precedence, REST and snapshot resolvers, library API
- [docs/agents/testing.md](docs/agents/testing.md): test patterns, fakes, what is and isn't covered, manual testing in Figma
- [docs/agents/recipes.md](docs/agents/recipes.md): step-by-step checklists (new export option, color mode, server, style type, …)
- [docs/agents/known-issues.md](docs/agents/known-issues.md): pitfalls, inconsistencies and tech debt found in the code

## Rules

### Architecture

1. **Transform logic goes in `src/common/`**, never in `src/app/` or `src/cli/`. `src/common` must stay environment-agnostic: no DOM, no Node built-ins, and no `figma.*` (only `tokensToVariables.ts` uses `figma`, guarded by `typeof figma !== 'undefined'`).
2. **Read Figma data only through `IResolver`.** If a transform needs new data, add a method to `IResolver` and implement it in **all three** resolvers: `PluginAPIResolver` (src/app/api), `RestAPIResolver` and `FileResolver` (src/cli). Also update `createExtensionResolver` in `extendedCollections.ts`, which wraps a resolver.
3. **Keep plugin, CLI and API in parity.** REST data is reshaped into Plugin API shapes in `RestAPIResolver` (e.g. `textNodeToStyle`, `restLayoutGridToPlugin`, the `FONT_STYLE`→`FONT_WEIGHT` scope fix), so the transforms see one data model. Fix shape differences in the resolver, not in the transforms.
4. **Keep the import in step with the export.** If you change how something is exported, check `tokensToVariables.ts` can still read it back (see the `$extensions.figmaType: "EASING"` marker and the preset-curve matching in `motion.ts`). Add a round-trip test.
5. **Never let one bad variable abort an export.** `variablesToTokens` wraps each variable in try/catch and reports `[tokens-bruecke] Skipped variable …` with `warn(resolver, …)` from `src/common/warn.ts`. In `src/common`, always warn through `warn()`, never `console.warn`, so the library API can stay silent. Keep that pattern: throw a descriptive error that includes the raw value, and let the caller skip it.
6. **Plugin sandbox versus UI:** `figma.*` exists only in the controller. `fetch`, DOM, file download/upload and all push servers run in the **UI** iframe. They communicate only through `postMessage` (see [plugin-ui.md](docs/agents/plugin-ui.md)).
7. **The manifest uses `"documentAccess": "dynamic-page"`**, so use only the async Plugin API variants (`getLocalVariablesAsync`, `getVariableByIdAsync`, `getLocalPaintStylesAsync`, …). The sync versions throw.
8. **CLI stdout belongs to the JSON.** In `src/cli/`, log progress with `log()` from `logger.ts` (stderr, silenced by `--quiet`) and errors with `console.error`. Never use `console.log` on the export path. The library API (`src/api`) must not log, exit or read env vars: inject `silentLog`, and pass `onWarning` (default: ignore) as the resolver's `warn`.
9. **Privacy:** analytics (`src/app/api/analytics.ts`) may only send fixed event paths, never token data, names, URLs or credentials. A new event must be added to the "Privacy and analytics" list in README.md.

### Export settings live in many places

An export option (a field of `ExportSettingsI`) must be added or changed in **all** of the following, or the products drift apart. The full checklist is in [recipes.md](docs/agents/recipes.md#add-an-export-option).

- `global.d.ts` → `ExportSettingsI`
- `api.d.ts` → `ExportOptions` (a compile-time check in `src/api/index.ts` fails if the keys differ)
- `src/cli/defaults.ts` → `defaultConfig` (CLI + API defaults)
- `src/app/controller/storageConfig.ts` → `createDefaultJSONSettingsConfig` (plugin defaults, plus migration in `sanitizeProfileConfig`)
- `schemas/cli-options.schema.json` (with `default` and `description`)
- `README.md`, `skills/tokens-bruecke/SKILL.md`, `llms.txt` (if CLI-relevant)
- the UI toggle (`AdvancedSettingsView` or `SettingsView`) and, if it is a flag, `src/cli/index.ts` + `src/cli/options.ts`

### Documentation must stay in sync

User-facing behaviour is documented in **README.md**, **skills/tokens-bruecke/SKILL.md**, **llms.txt** and the **schemas/**. Upstream feature commits update them in the same commit as the code. Do the same. **Never edit CHANGELOG.md by hand**: CI generates it from Conventional Commits at release time. If you change something these docs/agents files describe, update them too.

## Code conventions

- **Formatting:** Prettier 2 with `.prettierrc`: single quotes, semicolons, 2 spaces, `trailingComma: es5`. (`.prettierrc.yml` with `singleQuote: false` exists but is shadowed by `.prettierrc`, so ignore it.)
- **Naming:** interfaces and types often end in `I` (`ExportSettingsI`, `TokenFileI`, `PropsI`). Files are camelCase and named after their main export (`normalizeValue.ts` exports `normalizeValue`). React views live in `views/<Name>View/index.tsx` with a `styles.module.scss` beside them. Use named exports; `Container` is the only default export.
- **Comments explain _why_**, often with the Figma quirk or issue behind it (e.g. "The REST API reports … as `FONT_STYLE`"). Keep that density. Don't add comments that restate the code. There are commented-out `console.log` lines; don't add more.
- **Warnings** from the transform core use the prefix `[tokens-bruecke]`.
- **Ambient types:** `global.d.ts` and `plugin-types.d.ts` declare global types (no imports needed). `src/cli/*.ts` and `src/api/index.ts` reference them with `/// <reference path="../../global.d.ts" />`. `api.d.ts` must stay self-contained (no ambient types): it is shipped to npm as is.
- **Numbers:** use `decimal.js` (`new Decimal(x).toDecimalPlaces(n)`) for rounding Figma's float noise, as `normalizeValue.ts` and `motion.ts` do.
- **Tests** are colocated as `*.spec.ts` next to the module. Add or update tests for every change in `src/common/` and `src/cli/` (see [testing.md](docs/agents/testing.md)).

## Git, commits, release

- **Conventional Commits** with scopes as seen in history: `feat(cli): …`, `fix(import): …`, `fix: …`, `docs: …`, `ci: …`, `chore: release vX.Y.Z`. `feat` gives a minor version, `fix` a patch, `feat!`/`BREAKING CHANGE` a major. Write the body in plain prose: what changed for the user and why.
- Branches: `feat/<topic>`, `fix/<topic>`, `ci/<topic>`, `release/vX.Y.Z`. PRs go to `main`.
- **Release** (upstream): a `chore: release vX.Y.Z` PR bumps only `package.json`. Pushing tag `vX.Y.Z` runs [release.yml](.github/workflows/release.yml): build, `npm publish --provenance` (OIDC), a GitHub release with `dist/figma-plugin.zip`, and an auto-generated CHANGELOG commit to `main`. Publishing to the Figma Community is **not** automated.
- **This checkout is a fork** (`origin` = `skraegelin/tokensbruecke-figma-plugin`). The npm package name `tokens-bruecke`, the plugin id in `manifest.json` and the links in `src/app/controller/config.ts` belong to upstream (`tokens-bruecke/figma-plugin`). Don't push tags, publish to npm or change those identifiers unless the user asks.

## Before you finish a change

1. `npx vitest run`: all green (328 tests at v3.20.0).
2. `npx tsc -p tsconfig.cli.json --noEmit` and `npx tsc -p tsconfig.plugin.json --noEmit --skipLibCheck`: no errors.
3. `pnpm run build`: succeeds (the two webpack size warnings are expected).
4. Prettier on the files you touched.
5. Docs updated (README / SKILL.md / llms.txt / schemas / docs/agents) where behaviour changed.
6. For UI or sandbox changes, which have no automated tests: say that it needs a manual check in Figma and describe the steps (see [testing.md](docs/agents/testing.md#manual-testing-in-figma)).
