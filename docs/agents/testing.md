# Testing

## Running

```bash
pnpm test                                        # all tests once (about 7 s)
npx vitest run src/common/transform/motion.spec.ts
npx vitest run -t "extended collections"
pnpm test:watch                                  # watch mode: don't start it from an agent
```

[vitest.config.ts](../../vitest.config.ts) only sets the path aliases. The environment is Node; there is no DOM and no jsdom.

## What is covered

| Area               | Specs                                                                                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Variables → tokens | `variablesToTokens.spec.ts` (DTCG format, motion, ordering, unconvertible values), `extendedCollections.spec.ts`, `normalizeValue.spec.ts` (colors, composed colors, opacity), `normalizeType.spec.ts`, `motion.spec.ts`, `groupObjectNamesIntoCategories.spec.ts`, `export.spec.ts` (meta / createdAt) |
| Styles             | `styles/colorStylesToTokens.spec.ts`, `styles/effectStylesToTokens.spec.ts`, `styles/gridStylesToTokens.spec.ts`, `color/getGradientGeometry.spec.ts`, `text/getFontStyleAndWeight.spec.ts`                                                                                                             |
| Files              | `splitTokensIntoFiles.spec.ts`                                                                                                                                                                                                                                                                          |
| Import             | `tokensToVariables.spec.ts` (pure helpers), `tokensToVariables.import.spec.ts` (full import against a fake `figma`)                                                                                                                                                                                     |
| CLI                | `options.spec.ts`, `fileResolver.spec.ts`, `restApiResolver.spec.ts`, `init.spec.ts`, `prompt.spec.ts`, `updateCheck.spec.ts`                                                                                                                                                                           |
| Library API        | `api/index.spec.ts`                                                                                                                                                                                                                                                                                     |

**Not covered:** everything in `src/app/` (React views, controller message handling, `storageConfig.ts`, the push servers, download/import helpers) and `textStylesToTokens.ts` on its own. Check changes there by hand in Figma (below), and say in your report that this was not covered by automated tests.

## Patterns

**Inline fixtures in Plugin API shape.** Build `Variable[]` / `VariableCollection[]` objects and cast them: `[...] as unknown as Variable[]`. Use Figma-like ids (`'VariableID:1:2'`, `'VariableCollectionId:1:1'`, mode `'1:0'`) or short ones (`'v1'`, `'c1'`, `'m1'`). Both styles are used.

**A stub resolver.** The transforms only call the resolver methods they need, so a partial object is enough:

```ts
const resolver = {
  getVariableById: async (id) => variables.find((v) => v.id === id) ?? null,
  getVariableCollectionById: async (id) =>
    collections.find((c) => c.id === id) ?? null,
} as unknown as IResolver;
```

For end-to-end tests through `getTokens`, use a complete `IResolver` (see `export.spec.ts`, `emptyResolver`) or `new FileResolver(snapshot, silentLog)`, which turns a snapshot object into a real resolver.

**Settings.** Start from `defaultConfig` (`@cli/defaults`) and override fields (`{ ...defaultConfig, splitByMode: true }`), or give a minimal `baseConfig as ExportSettingsI` as in `variablesToTokens.spec.ts`.

**Fake `figma` global for the import.** `tokensToVariables.import.spec.ts` defines `createFakeFigma()` (collections with `renameMode`/`addMode`, variables with `setValueForMode`) and installs it with `vi.stubGlobal('figma', fake)` in `beforeEach`, then removes it with `vi.unstubAllGlobals()` in `afterEach`. Reuse or extend that fake for import tests; don't call the real API.

**Console noise.** The transforms warn through `warn()` (src/common/warn.ts), which falls back to `console.warn` when the resolver has no `warn`. To check a warning, give the test resolver a `warn: vi.fn()`, or spy on `console.warn` with `vi.spyOn(console, 'warn').mockImplementation(() => {})`, and assert the `[tokens-bruecke]` message.

**CLI and update check.** `init.spec.ts` and `updateCheck.spec.ts` inject their dependencies (`ask`, `isTTY`, `env`, `now`, `fetch`, `cacheFile`) and don't touch the real terminal, network or home directory. Do the same for new CLI code: take side effects as parameters with production defaults.

**Shared example files.** `examples/tokens-snapshot.json` is loaded by `fileResolver.spec.ts` and `api/index.spec.ts`. If you change it, those tests change too.

## What a good test for a change looks like

- A bug fix: a test that fails without the fix and names the Figma situation in its title (e.g. `'keeps a 0 spread the REST API leaves out'`).
- An export change: assert the exact token (`toStrictEqual`) in both `useDTCG: true` and `false` if the key or dimension format matters.
- An export change that the import must read back: add a round-trip test (export value → `convertTokenValueToFigmaValue` / `tokensToVariables` → the same Figma value).
- REST or snapshot parity: feed the same data through `restVariablesToSnapshot` / `RestAPIResolver` helpers and `FileResolver`, and compare the outputs.

## Manual testing in Figma

1. `pnpm dev` (watch build of the plugin into `dist/figma-plugin/`).
2. In Figma Desktop: **Plugins → Development → Import plugin from manifest…** → choose **`dist/figma-plugin/manifest.json`**.
3. Run the plugin in a file with variables. Use **Plugins → Development → Open console** for controller and UI logs (`[tokens-bruecke]` warnings, import errors).
4. After a rebuild, re-run the plugin (or use "Hot reload plugin" in the Development menu).
5. Checklist for UI changes: light and dark theme, the empty file view, preview open/closed, window resize, switching profiles (settings persist after closing and reopening the plugin), import of a file you just exported.

The CLI can be tested without Figma: `pnpm run build:cli && node bin/cli.js --input examples/tokens-snapshot.json --stdout --quiet`.
