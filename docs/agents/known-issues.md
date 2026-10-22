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

8. **The library API "doesn't log"**, but the core's `console.warn` calls (skipped variables, `cannot find variable` for `#missing#`, collisions, extended-collection skips) still write to stderr when used as a library.
9. **Stale comment:** `PluginTokenI.$type` in global.d.ts says `$type` is omitted for string/boolean in DTCG mode. It isn't anymore: tests assert that `$type` is always written. The import still understands the old `figmaType` fallback.

## Import

10. `referenceToFigmaPath` turns every `.` into `/`, so collection or variable names containing dots can't be alias targets.
11. Values without a mode name are written to `collection.modes[0]`, not to `defaultModeId`.
12. Existing variables keep their `resolvedType`; a token of another type fails on `setValueForMode` and is reported per token.

## Plugin (controller and UI)

13. **No error handling around `getTokens` in the controller.** If the export throws, no `setTokens` reply is sent. Download and preview silently do nothing, and the push button spins until its 10 s fallback.
14. **Import from the empty-file view has no result feedback.** `Container.handleImportTokens` sends `importTokens`, but only `SettingsView` listens for `importResult`. On success the view switches to Settings after the reply was sent, so there is no toast. If the import fails or creates nothing, the Import button keeps spinning.
15. **Push error handling:** `SettingsView` awaits the servers one after another without try/catch. `pushToCustomURL` runs `JSON.parse(credentials.headers)`, which throws on the default empty headers field, and it shows no success or error toast. Because it runs last, the throw only skips `setIsPushing(false)`, so the button spins until its 10 s fallback. `pushToJSONBin` has no try/catch, so a network error there also stops every server after it.
16. **Credentials in logs:** `SettingsView` logs the whole active profile (`'JSONsettingsConfig Settings View >>>>'`) on every change, and the profile contains server tokens. They appear in the Figma developer console. Credentials are also stored unencrypted in `figma.clientStorage`, which is local to the machine.
17. The `activeProfileConfig` message is handled in the controller, but nothing sends it.

## Dead code (safe to ignore; remove only in a dedicated cleanup)

- `src/common/transform/findByVariableId.ts` (unused) and `removeDollarSign.ts` (only a commented-out import)
- `src/app/controller/changeUIFrameSize.ts` (unused; the controller resizes inline)
- `StatusPicture` statuses `'tokens'` and `'import'` (only `'error'` is used)
- global.d.ts: `nameConventionType`, `variableFeatureType`, `PaintStyleExtended`
- `getTokens(resolver, config, _state)`: `_state` is unused (the controller passes the profile twice)
- `isBrunchExist` (typo) in `githubPullRequest.ts`; leftover `console.log` debug lines in `getTokensStat`, `SettingsView` and the servers
