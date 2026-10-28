# Contributing to TokensBruecke

Thanks for taking the time to contribute! Here's everything you need to get started.

---

## Getting started

**Prerequisites:** Node.js, pnpm

```bash
git clone https://github.com/tokens-bruecke/figma-plugin.git
cd figma-plugin
pnpm install
```

**Development build (watch mode):**

```bash
pnpm dev
```

Load the plugin in Figma: **Plugins → Development → Import plugin from manifest** and point it to `dist/figma-plugin/manifest.json` (the build output, next to `code.js` and `ui.html`).

**Run tests:**

```bash
pnpm test         # once
pnpm test:watch   # watch mode
```

---

## Project structure

| Path          | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| `src/app/`    | Figma plugin UI (React)                              |
| `src/cli/`    | CLI entry point                                      |
| `src/common/` | Shared transform logic (used by both plugin and CLI) |
| `docs/`       | Documentation site ([Astro Starlight](https://starlight.astro.build)) |

---

## Documentation

The docs are published to [tokens-bruecke.github.io/figma-plugin](https://tokens-bruecke.github.io/figma-plugin/) on every push to `main` that touches `docs/`. Pages are Markdown in `docs/src/content/docs/`.

```bash
cd docs
pnpm install
pnpm dev          # http://localhost:4321/figma-plugin/
```

**Screenshots** are rendered from the real plugin UI with demo data, in light and dark. Regenerate them after a UI change (needs `pnpm install` in the repo root too):

```bash
cd docs
pnpm exec playwright install chromium   # once
pnpm shots                               # all scenes
pnpm shots github profiles               # only these
```

Each scene (the stored settings and the clicks that lead to the captured state) is defined in `docs/screenshots/scenes.mjs`. Use it on a page with `<Screenshot name="github" alt="…" />`.

---

## Making changes

1. Fork the repo and create a branch from `main`.
2. Write code — keep changes focused and minimal.
3. Add or update tests for any logic in `src/common/`.
4. Open a pull request against `main`.

### Commit style

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix                         | Effect             |
| ------------------------------ | ------------------ |
| `feat:`                        | Minor version bump |
| `fix:`                         | Patch version bump |
| `feat!:` / `BREAKING CHANGE:`  | Major version bump |
| `chore:`, `docs:`, `refactor:` | No release         |

---

## Reporting bugs

Open a [GitHub issue](https://github.com/tokens-bruecke/figma-plugin/issues) with:

- Steps to reproduce
- Expected vs. actual behavior
- Plugin version and Figma version

---

## License

By contributing, you agree your changes will be licensed under the project's [MIT License](./LICENSE).
