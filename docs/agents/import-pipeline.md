# Import pipeline (tokens → Figma variables)

The import is in [src/common/transform/tokensToVariables.ts](../../src/common/transform/tokensToVariables.ts). It runs **only in the plugin controller**: it calls `figma.variables.createVariableCollection` and `createVariable` and `variable.setValueForMode` directly, and without a global `figma` it reports errors instead of creating anything. It is reached through the UI button "Import tokens (Beta)" (in `SettingsView` and `EmptyView`), which sends `{ type: 'importTokens', tokens }` to the controller.

## Result

```ts
{ success, message, collectionsCreated, variablesCreated, variablesUpdated, errors: string[], composedColorsRejected }
```

`success` is `true` unless something threw at the top level. Problems with single tokens go into `errors`. `message` sums up the counts plus the first non-"Skipped" error. The UI shows it as a toast: `success` (10 s) when clean, `warn` (60 s) on success with errors, and `error` (stays until clicked) on failure. It also logs all errors with `console.error`.

## Algorithm

```
existing collections and variables → variableMap: "Collection/var/name" → Variable
drop root $extensions
for each top-level key (= collection name, object values only):
  find collection by name, or figma.variables.createVariableCollection(name)
  tokens = extractTokens(group)              recursive; skips $-keys, value/type/description/scopes;
                                             a "token" has a value ($value|value) AND a determinable type
  modes  = union of $extensions.mode (or extensions.mode) keys, in first-seen order
    rename collection.modes[0] to the first mode name; addMode() for the missing ones; re-fetch collection
  PASS 1  for each token:
    type = getTokenType(token)               (missing → error "missing type")
    variable = variableMap[collection/path] or createVariable(path, collection, mapTokenTypeToFigmaType(type, value))
    an existing variable of another type → error, token skipped (fontWeight fits FLOAT and STRING)
    description (if not empty); scopes (validated; never on TIMING/EASING;
    new fontFamily/fontWeight variables without scopes get ['FONT_FAMILY'] / ['FONT_WEIGHT'])
  PASS 2  for each variable:
    $value → collection.defaultModeId; each $extensions.mode[name] → the mode with that name
    convertTokenValueToFigmaValue(); an unresolved reference → deferred
PASS 3  after all collections: deferred values again; still unresolved → error "Alias reference not found"
```

`$value` goes to `collection.defaultModeId` (Figma's first mode).

## Type detection (`getTokenType`)

In this order:

1. scopes (`scopes`, else `$extensions.figmaScopes`) are all opacity scopes and the declared type is missing, `number` or `string` → `opacity`. When the token has no scopes at all and updates an existing FLOAT variable with opacity scopes, `resolveTypeForExistingVariable` turns a `number`, or a `string` ending in `%`, into `opacity` too.
2. `$extensions.figmaType === 'EASING'` → `cubicBezier` (easing presets exported as strings)
3. `$type`, then `type`
4. `$extensions.figmaType` `STRING` → `string`, `BOOLEAN` → `boolean`, `FLOAT` → `opacity` (legacy strict-DTCG exports)
5. inferred from the value: boolean → `boolean`; a string not starting with `{` → `string`; otherwise `null` (not a token)

## Token type → Figma type (`mapTokenTypeToFigmaType`)

`color` → COLOR; `number`, `dimension`, `opacity` → FLOAT; `boolean` → BOOLEAN; `string`, `fontFamily` → STRING; `duration` → TIMING; `cubicBezier` → EASING; `fontWeight` → FLOAT, or STRING when the value is a non-numeric string; **everything else** (typography, shadow, grid, blur, gradient, …) → STRING. Those composite values can't be written, so they end up as errors.

## Value conversion (`convertTokenValueToFigmaValue`)

| Type                 | Accepted input                                                                                                                                                                  | Figma value                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| any                  | `"{a.b.c}"` / `"{a.b.c.$value}"`                                                                                                                                                | `VARIABLE_ALIAS` to `variableMap["a/b/c"]` (or the entry whose dotted path matches, for names with dots); not found yet → kept as a string (deferred) |
| `color`              | `#rrggbb[aa]`, `rgb()/rgba()`, DTCG object (uses `hex` first, else sRGB `components`), `{r,g,b,a}` (0..1, or 0..255 if any channel > 1), composed color `{ components, alpha }` | `RGBA`, or `{ color, opacity }` for composed colors                                                                                                   |
| `opacity`            | `0.5`, `"50%"`, `50`                                                                                                                                                            | 0..100 percent (values ≤ 1 are treated as fractions)                                                                                                  |
| `number`/`dimension` | `{ value, unit }`, `"16px"`, `"1rem"`, number                                                                                                                                   | number (**unit dropped**)                                                                                                                             |
| `fontWeight`         | number or numeric string → number; other string unchanged                                                                                                                       |                                                                                                                                                       |
| `fontFamily`         | string or array (first entry)                                                                                                                                                   | string                                                                                                                                                |
| `duration`           | `{ value, unit: 'ms'\|'s' }`, `"300ms"`, `"0.3s"`, number (ms)                                                                                                                  | seconds                                                                                                                                               |
| `cubicBezier`        | `[x1,y1,x2,y2]` (matched to a preset ±0.02), preset name, `"spring(bounce n)"`, Figma easing object                                                                             | `MotionEasing`                                                                                                                                        |
| `boolean` / `string` |                                                                                                                                                                                 | `Boolean(v)` / `String(v)`                                                                                                                            |

**Not importable:** HSLA CSS and HSLA object colors (they throw "Unsupported color format"), and all style tokens.

## Composed colors (color alias with its own opacity)

`setVariableValue` tries the `{ color, opacity }` object first, then the legacy `COMPOSE_COLOR` expression. After each attempt it checks that `variable.valuesByMode[modeId]` really holds a composed color, because some clients drop the value without throwing. If both fail, `composedColorsRejected++`, an error pointing to [figma/plugin-typings#375](https://github.com/figma/plugin-typings/issues/375) is added, and the UI toast links to it (`COMPOSED_COLOR_ISSUE_URL`).

## Round-trip rules

When you change the export, keep these working (there are tests for most):

- easings: curve ↔ preset (`parseEasing`), names ↔ presets, the `figmaType: 'EASING'` marker
- durations: ms ↔ seconds
- opacity: fraction or percent ↔ 0..100, detected by scope
- fontFamily and fontWeight: default scopes on new variables keep the type stable on the next export
- composed colors: `{ components, alpha }` ↔ `{ color, opacity }`
- aliases: `{Collection.a.b}` ↔ `Collection/a/b` in `variableMap`

These don't round-trip (they are documented as limitations in the README): exports with `omitCollectionNames` or `splitByMode` (top-level keys no longer match the collections), extended collections (imported as plain collections), units other than px, and style tokens.

## Things to watch

- A reference can't tell a dot in a name from a group separator. `findReferencedVariable` tries the plain `a/b/c` path first, then compares the map keys in their dotted form, so `{Core.spacing.1.5}` finds `spacing/1.5`.
- Existing variables keep their type: the import doesn't change `resolvedType`. A token of another type is skipped with an error that names both types.
- Scopes the runtime doesn't know (e.g. `COLOR_OPACITY` on an old client) give a "Failed to set scopes" error, not a crash.
- Tests for this file run against a fake `figma` global (`vi.stubGlobal`), see [testing.md](testing.md).
