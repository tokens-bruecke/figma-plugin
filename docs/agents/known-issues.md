# Known issues, pitfalls and tech debt

Found while analysing v3.20.0 (2026-10-22). Entries marked **(reproduced)** were confirmed by running the built library API. The others come from reading the code. This is a map for agents, not a to-do list: fix an item only when a task calls for it, with a test, and then remove it here.

## Tooling pitfalls

| Pitfall                                                                                                                                           | What to do                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm test` runs vitest in **watch mode** in a terminal and never exits.                                                                          | Use `npx vitest run` or `pnpm test -- --run`.                                       |
| `tsc -p tsconfig.plugin.json` reports 10 errors from conflicting DOM and `@figma/plugin-typings` declarations (`fetch`, `Navigation`, `console`). | Pre-existing. Use `--skipLibCheck`; the code itself type-checks clean.              |
| Two Prettier configs: `.prettierrc` (single quotes) wins over `.prettierrc.yml` (double quotes). 7 files are already off-format.                  | Format only the files you touch. Don't reformat the whole repo in a feature change. |
| CONTRIBUTING.md says to import the root `manifest.json` into Figma.                                                                               | Import `dist/figma-plugin/manifest.json`; `code.js` and `ui.html` only exist there. |
| TypeScript is non-strict (`strictNullChecks: false`, `noImplicitAny: false`). The compiler won't catch `null`/`undefined` bugs.                   | Guard optional data yourself (`?.`, `??`), especially for REST and snapshot input.  |
| `@utils/*` path alias points at a missing `src/utils`.                                                                                            | Don't use it.                                                                       |

## Export: correctness and parity

1. **An effect style that mixes a shadow and a blur breaks the whole export (reproduced).** `effectStylesToTokens` decides by `effects[0].type`. If that is a shadow, it maps _every_ effect through `wrapShadowObject`, and a blur has no `color` → `TypeError`. Styles are not wrapped in a per-item try/catch like variables, so the error aborts `getTokens` (API: `CONVERSION_FAILED … reading 'a'`). An effect style with `effects: []` would fail the same way on `effects[0].type`.
2. **`storeStyleInCollection` naming a collection that isn't in the output breaks the export (reproduced).** `mergeStylesIntoTokens` does `Object.assign(variableTokens[name], …)` → `Cannot convert undefined or null to object`. This happens when the stored name belongs to another file or a renamed collection (plugin settings persist across files), or with `omitCollectionNames` (no collection keys exist).
3. **Style aliases ignore `omitCollectionNames` (reproduced).** The style converters call `getAliasVariableName` without that flag, so with `omitCollectionNames` a color style gives `"{Core.color.brand}"` while the token sits at `color.brand`, and the reference doesn't resolve.
4. **REST mode drops style descriptions.** `RestAPIResolver` sets `description: ''` (paint/effect/grid) or leaves it out (text). The plugin exports the real descriptions. The REST `styles` map has `description`, so the data is available but not wired up.
5. **Grid styles:** only the first two layout grids are read; the first is always treated as columns and the second as rows, whatever their `pattern`. Sizes of `0` are left out (truthy checks).
6. **Blur tokens always use `$type`/`$value`**, even with `useDTCG: false` (documented in the README as current behaviour). Only the first blur effect is exported.
7. **Color styles** export only a single SOLID paint or a first-paint gradient; other paint stacks are skipped without a warning.
8. **The library API "doesn't log"**, but the core's `console.warn` calls (skipped variables, `cannot find variable` for `#missing#`, collisions, extended-collection skips) still write to stderr when used as a library.
9. **Stale comment:** `PluginTokenI.$type` in global.d.ts says `$type` is omitted for string/boolean in DTCG mode. It isn't anymore: tests assert that `$type` is always written. The import still understands the old `figmaType` fallback.

## Import

10. `referenceToFigmaPath` turns every `.` into `/`, so collection or variable names containing dots can't be alias targets.
11. Values without a mode name are written to `collection.modes[0]`, not to `defaultModeId`.
12. Existing variables keep their `resolvedType`; a token of another type fails on `setValueForMode` and is reported per token.

## Plugin (controller and UI)

17. The `activeProfileConfig` message is handled in the controller, but nothing sends it.

## Dead code (safe to ignore; remove only in a dedicated cleanup)

- `src/common/transform/findByVariableId.ts` (unused) and `removeDollarSign.ts` (only a commented-out import)
- `src/app/controller/changeUIFrameSize.ts` (unused; the controller resizes inline)
- `StatusPicture` statuses `'tokens'` and `'import'` (only `'error'` is used)
- global.d.ts: `nameConventionType`, `variableFeatureType`, `PaintStyleExtended`
- `getTokens(resolver, config, _state)`: `_state` is unused (the controller passes the profile twice)
- `isBrunchExist` (typo) in `githubPullRequest.ts`; leftover `console.log` debug lines in `getTokensStat`, `SettingsView` and the servers
