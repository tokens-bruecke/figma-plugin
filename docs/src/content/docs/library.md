---
title: "Use as a library"
description: "Call the converter from your own build pipeline with fetchTokens and convertTokens."
---

The converter is also available as a module, for build pipelines that want tokens in the same process: no child process, no files on disk, and the token is passed as an argument instead of an environment variable.

```ts
import { fetchTokens, convertTokens } from 'tokens-bruecke/api';
import type { ExportOptions, TokensSnapshot } from 'tokens-bruecke/api';

// 1. Fetch from the Figma REST API
const tokens = await fetchTokens({
  fileKey: 'abc123',
  personalAccessToken: myToken, // or oauthToken
  options: { colorMode: 'hex', splitByMode: true },
});

// 2. Convert data you already have
const fromSnapshot = await convertTokens(snapshot, { splitByCollection: true });
const fromRest = await convertTokens(restResponse); // GET /v1/files/:key/variables/local
```

- **`options`** takes the same fields as the [CLI configuration file](../cli/options/#cli-configuration-file) and the same defaults, so the API and the CLI give identical output for the same settings.
- **Result:** one DTCG token tree when nothing is split. With `splitByCollection` it is keyed by collection name, and with `splitByMode` by `collection/mode`. See [Split results](#split-results) below for how these relate to the files the CLI writes.
- **`convertTokens`** accepts a [snapshot](../cli/options/#snapshot-input), or the raw response of the Figma REST variables endpoint (detected by its `meta` key). That response has no styles, so enabling any `includedStyles` with it throws `INVALID_ARGUMENT`.
- **Module formats:** the package ships an ESM and a CommonJS build of `tokens-bruecke/api`, so both `import` and `require` work. Each build has its own `TokensBrueckeError` class, so check `error.code` rather than `instanceof` if your code mixes the two.
- **No side effects:** the API does not write files, read environment variables, log or exit the process.
- **Warnings** (skipped variables and styles, aliases to variables missing from the data, name collisions) are not printed. Pass `onWarning` to receive them: `fetchTokens({ …, onWarning })` or `convertTokens(input, options, { onWarning })`.
- **Errors** are `TokensBrueckeError`s with a `code` (`INVALID_ARGUMENT`, `INVALID_SNAPSHOT`, `FIGMA_FORBIDDEN`, `FIGMA_NOT_FOUND`, `FIGMA_RATE_LIMITED`, `FIGMA_REQUEST_FAILED`, `CONVERSION_FAILED`) and the original error as `cause`. `FIGMA_FORBIDDEN` usually means the file is not on an Enterprise plan, or the token lacks the `file_variables:read` scope.

## Split results

For a split key, the API returns the bare token tree. The CLI writes the file as `{ "<collection>": <that tree> }`, so the tree sits in a group named after the collection. To get the same contents as a CLI file, wrap it again:

```ts
for (const [key, tree] of Object.entries(tokens)) {
  const collection = key.split('/')[0]; // simple names only, see below
  const file = JSON.stringify({ [collection]: tree }, null, 2);
}
```

- **Aliases** inside a tree are qualified with the collection name (for example `{Semantic.spacing.md}`), so the tree has to be wrapped in `{ [collection]: tree }` for references to resolve.
- **Names are raw.** The CLI replaces characters that are illegal in file names (such as `/`) in collection and mode names. The API keys keep the Figma names as they are, except that `.`, `{` and `}` in a collection name become `-` (`1. Primitives` is keyed as `1- Primitives`), because references use them. A collection or mode name can contain `/`, so splitting a key at the first `/` is only safe for simple names. Match the key against the collection names in `$extensions["tokens-bruecke-meta"].variableCollections`, with those characters replaced, instead, as the CLI does.
