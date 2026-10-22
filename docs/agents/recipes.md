# Recipes

Checklists for the changes this codebase sees most. Each lists **every** place that has to change. Missing one is the usual way plugin, CLI and API drift apart. Finish with the checks in [AGENTS.md](../../AGENTS.md#before-you-finish-a-change).

## Add an export option

Example: a boolean `fooBar`, default `false`, that changes how values are exported.

1. **Type:** `global.d.ts` → `ExportSettingsI.fooBar: boolean` (make it optional `?` if old stored profiles may lack it and `undefined` should mean the default, like `omitCreatedAt`).
2. **Public API type:** `api.d.ts` → `ExportOptions.fooBar?: boolean` with a JSDoc line. (`src/api/index.ts` fails to compile until the keys match.)
3. **CLI and API default:** `src/cli/defaults.ts` → `defaultConfig.fooBar = false`. (`init` writes every default into the generated config automatically.)
4. **Plugin default and migration:** `src/app/controller/storageConfig.ts` → `createDefaultJSONSettingsConfig()` and, if needed, an explicit `fooBar: safeConfig.fooBar ?? false` in `sanitizeProfileConfig`.
5. **Implementation:** read it in `src/common/…`. Pass it through the props of `normalizeValue` / `variablesToTokens` as the existing options are passed. Give it the default in the destructuring (`fooBar = false`) so callers that build partial configs (tests, old profiles) behave.
6. **Import:** if the option changes the output shape, make sure `tokensToVariables.ts` still reads both shapes.
7. **UI:** add a toggle to `toggleItems` in `src/app/views/AdvancedSettingsView/index.tsx`, or to the main panel in `SettingsView` for prominent options.
8. **CLI flag** (only for options people switch per run): see [Add a CLI flag](#add-a-cli-flag).
9. **Schema:** `schemas/cli-options.schema.json` → a property with `type`, `default`, `description` (`additionalProperties` is `false`, so editors reject unknown keys).
10. **Docs:** README ("General settings" section + the commented example in "CLI Configuration File" + the TOC), `skills/tokens-bruecke/SKILL.md` ("Key options"), `llms.txt` if relevant.
11. **Tests:** both values of the option in the transform's spec; `options.spec.ts` if precedence matters.

## Add a CLI flag

1. `src/cli/index.ts`: `.option('foo-bar', { global: false, description, type })`. Keep `global: false` so it stays out of `init --help`. It is automatically also `FIGMA_FOO_BAR`.
2. If it overrides an export setting: add it to `CliOverrides` and `resolveExportOptions` in `src/cli/options.ts` (`overrides.fooBar ?? config.fooBar ?? defaultConfig.fooBar`), and pass `argv['foo-bar']` where `resolveExportOptions` is called. Don't give the yargs option a `default`, or it would always override the config file.
3. Validation belongs in the second `.check()` (output-related) or the first (input/auth).
4. Tests in `options.spec.ts`. Docs: the README options table, the SKILL.md flags table, llms.txt.

## Add a color mode

1. `global.d.ts` → `colorModeType` union; `api.d.ts` → `ColorMode` union.
2. `src/common/transform/color/convertRGBA.ts`: a converter function plus a `case` in `convertRGBA`. Input is normalized 0..255 integers with alpha rounded to 2 decimals.
3. `src/common/transform/color/composeColor.ts`: if the new mode returns an object, add it to `DTCG_COLOR_MODES` (alpha key `alpha`) or `OBJECT_COLOR_MODES` (alpha key `a`).
4. Import: `convertTokenValueToFigmaValue` in `tokensToVariables.ts` must parse it, or the README must say it can't be imported (as for HSLA). DTCG objects with a `hex` fallback are imported through `hex` for free.
5. UI: an option in the "Color mode" `Dropdown` in `SettingsView` (grouped sections). CLI init: `COLOR_MODES` in `src/cli/init.ts`.
6. Schema enum (`colorMode`), README "Color mode" list, the SKILL.md `colorMode` list, the comment in the README config example.
7. Tests: `normalizeValue.spec.ts` (`getColor` block), import tests, and `src/cli/init.spec.ts`, whose tests pin the color-mode choice indexes (`'8'` is `oklch-dtcg`, `'9'` is out of range).

## Change how a variable type is exported

1. Type: `normalizeType.ts`. Value: `normalizeValue.ts` (keep the `throw` for unknown shapes).
2. Import: `getTokenType`, `mapTokenTypeToFigmaType` and `convertTokenValueToFigmaValue` in `tokensToVariables.ts`. If the new `$type` can't identify the Figma type on its own, add an `$extensions.figmaType` marker as is done for EASING.
3. README "Variables types conversion" and "Scopes limitations" tables.
4. Tests: export and round trip.

## Support a new Figma value shape

Figma changes value shapes over time (see composed colors: `{ color, opacity }` versus `VARIABLE_EXPRESSION`). The established pattern, from `color/composeColor.ts`:

1. Write a type guard for **each** shape (`isComposedColorObject`, `isComposedColorExpression`) and a union guard.
2. Normalize every shape into one internal representation (`getComposedColorParts`) and throw `Unsupported … value: <JSON>` for anything else, so the variable is skipped with a warning rather than crashing the export.
3. On import, try the current shape first and fall back to the old one. Check that the value actually stuck.
4. Document both shapes in the README and in `schemas/tokens-snapshot.schema.json` (snapshot users pass Plugin API values through verbatim).
5. Add a `[tokens-bruecke]` warning path and a test for an unknown shape.

## Add a style property, or a new style type

- **Property of an existing style:** edit the converter in `src/common/transform/styles/`. Check that the REST resolver provides the field (`RestAPIResolver.textNodeToStyle` and friends), add it there if not, and add it to the matching `definitions` entry of `schemas/tokens-snapshot.schema.json`.
- **New style type** (rare: Figma has paint, text, effect and grid):
  1. `stylesType` and `IncludedStylesI` in global.d.ts; `ExportOptions.includedStyles` and the `TokensSnapshot` style arrays in api.d.ts.
  2. Defaults in `cli/defaults.ts` and `controller/storageConfig.ts`.
  3. A new `IResolver.getLocalXStyles()` → implement it in `PluginAPIResolver`, `RestAPIResolver` (the `fetchStyleNodes` style-type union + node conversion), `FileResolver` (`TokensSnapshotI`, `STYLE_KEYS`, snapshot validation) and `createExtensionResolver`. Also update the full `IResolver` stub `emptyResolver` in `src/common/export.spec.ts`: specs are type-checked by `tsconfig.cli.json`.
  4. A converter plus a call in `stylesToTokens.ts`.
  5. UI `stylesList` in `SettingsView`; `STYLE_CHOICES` **and** `buildConfig` (writes `includedStyles` per type) in `cli/init.ts`, plus the choice-index tests in `init.spec.ts`; both schemas; README "Styles support"; SKILL.md, including its snapshot dump snippet.

## Add a push server

1. **Credentials type:** `global.d.ts` → a `XCredentialsI` interface (with `isEnabled: boolean`) and an entry in `ServerSettingsI` (the key is the server id, e.g. `bitbucket`).
2. **Defaults:** `controller/storageConfig.ts` → `servers.bitbucket` in `createDefaultJSONSettingsConfig()` **and** a deep-merge line in `sanitizeProfileConfig` (copy the `gitlab` lines).
3. **Implementation:** `src/app/api/servers/pushToBitbucket.ts` with the signature `(credentials, tokens, toastCallback, splitOptions?)`. Use `splitTokensIntoFiles(tokens, splitOptions, credentials.fileName)` if the server stores files, and report success or failure through `toastCallback({ title, message, options: { type } })`. Never let it throw unhandled: `SettingsView` awaits each server in turn.
4. **Form:** `ServerSettingsView/index.tsx` → a `viewsConfig.bitbucket` entry (`title`, `description` with a docs link, `fields[]` with `id`, `placeholder`, `type: 'input'`, `required`, default `value`).
5. **Wiring in `SettingsView/index.tsx`:** add an entry to `serverList` (`id`, `label`, `iconName`, which must exist in react-figma-ui's `Icon`. A `customIcon` would also need changes at the two places that render `serverList`: the server rows (`<Icon name={server.iconName} />`) and the `OverlayList` options), an `if (server.includes('bitbucket'))` block in the `setTokens`/`push` handler with `track('/push/bitbucket')`, and a `currentView === 'bitbucket'` branch in `selectRender`.
6. **Network:** `manifest.json` already allows `*`.
7. **Docs:** README "Push to server" (a section + the list at the top), the "Privacy and analytics" event list.
8. **Test** by hand (see [testing.md](testing.md#manual-testing-in-figma)); servers have no automated tests.

## Add a plugin message

1. If it carries tokens or results, extend `TokensMessageI['type']` (and `role`) in global.d.ts.
2. Controller: a new `if (msg.type === 'x')` block in `figma.ui.onmessage` (controller/index.ts). Keep it `async`-safe and reply with `figma.ui.postMessage`.
3. UI: post with `parent.postMessage({ pluginMessage: { type: 'x', … } }, '*')`. Listen in the component that owns the result (`window.addEventListener('message', …)` inside `useEffect`, and clean it up). Mind stale closures: `SettingsView` re-registers its listener when `JSONsettingsConfig` changes.
4. Update the protocol tables in [plugin-ui.md](plugin-ui.md#message-protocol).

## Add a method to `IResolver`

Implement it in `PluginAPIResolver` (`src/app/api/pluginApiResolver.ts`, async `figma.*` only), `RestAPIResolver`, `FileResolver` and `createExtensionResolver` (delegate). Update the stub resolvers in specs that implement the full interface (`export.spec.ts`). If it needs new snapshot data, extend `TokensSnapshotI`, `validateSnapshot`, the snapshot schema and `api.d.ts#TokensSnapshot`.

## Add an analytics event

`track('/fixed/path')` from the UI only, with a constant string and no data. Add the event to the README "Privacy and analytics" list in the same commit.

## Prepare a release (upstream maintainers only)

Bump `package.json#version` in a `chore: release vX.Y.Z` commit/PR, merge, then tag `vX.Y.Z` on `main` and push the tag. Don't edit CHANGELOG.md. In a fork, don't do this unless asked.
