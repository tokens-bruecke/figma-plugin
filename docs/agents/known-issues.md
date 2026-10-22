# Known issues, pitfalls and tech debt

The analysis of v3.20.0 (2026-10-22) found 17 issues. The bugs, the tooling problems and the dead code have been fixed since then, each with tests, so only the pitfalls below remain. If you find a new issue, add it here with where it is and how it shows up, and remove it again in the change that fixes it.

## Tooling pitfalls

| Pitfall                                                                                                                         | What to do                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 6 files are off-format upstream (`prettier --check "src/**/*.{ts,tsx}"`).                                                       | Format only the files you touch. Don't reformat the whole repo in a feature change. |
| TypeScript is non-strict (`strictNullChecks: false`, `noImplicitAny: false`). The compiler won't catch `null`/`undefined` bugs. | Guard optional data yourself (`?.`, `??`), especially for REST and snapshot input.  |
