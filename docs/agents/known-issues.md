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

9. **Stale comment:** `PluginTokenI.$type` in global.d.ts says `$type` is omitted for string/boolean in DTCG mode. It isn't anymore: tests assert that `$type` is always written. The import still understands the old `figmaType` fallback.

## Plugin (controller and UI)

17. The `activeProfileConfig` message is handled in the controller, but nothing sends it.

## Dead code (safe to ignore; remove only in a dedicated cleanup)

- `src/common/transform/findByVariableId.ts` (unused) and `removeDollarSign.ts` (only a commented-out import)
- `src/app/controller/changeUIFrameSize.ts` (unused; the controller resizes inline)
- `StatusPicture` statuses `'tokens'` and `'import'` (only `'error'` is used)
- global.d.ts: `nameConventionType`, `variableFeatureType`, `PaintStyleExtended`
- `getTokens(resolver, config, _state)`: `_state` is unused (the controller passes the profile twice)
- `isBrunchExist` (typo) in `githubPullRequest.ts`; leftover `console.log` debug lines in `getTokensStat`, `SettingsView` and the servers
