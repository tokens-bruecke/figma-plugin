# Known issues, pitfalls and tech debt

The analysis of v3.20.0 (2026-10-22) found 17 issues. The bugs, the tooling problems and the dead code have been fixed since then, each with tests, so only the pitfalls below remain. If you find a new issue, add it here with where it is and how it shows up, and remove it again in the change that fixes it.

## Tooling pitfalls

| Pitfall                                                                                                                         | What to do                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 6 files are off-format upstream (`prettier --check "src/**/*.{ts,tsx}"`).                                                       | Format only the files you touch. Don't reformat the whole repo in a feature change. |
| TypeScript is non-strict (`strictNullChecks: false`, `noImplicitAny: false`). The compiler won't catch `null`/`undefined` bugs. | Guard optional data yourself (`?.`, `??`), especially for REST and snapshot input.  |

## Dev Mode

| Issue                                                                                                                                                                       | Where                                                         | What to do                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Figma doesn't document `<a download>`, `<input type=file>` or clipboard access in the Dev Mode or VS Code iframe.                                                           | `downloadTokensFile.ts`, `CodePreviewView` (`clipboard-copy`) | Check them in the manual Dev Mode test. If one fails in VS Code, document it in README "Dev Mode". |
| A 2024 forum report says a published `["figma", "dev"]` plugin didn't show up in Dev Mode although the local build did.                                                     | `manifest.json`                                               | Check the published plugin in Dev Mode after the next Community release.                           |
| Reading variables and styles in Dev Mode is allowed by the general rule ("plugin APIs that read from the document"), but no page names `getLocalVariablesAsync` explicitly. | `PluginAPIResolver`                                           | Covered by the manual Dev Mode test.                                                               |
