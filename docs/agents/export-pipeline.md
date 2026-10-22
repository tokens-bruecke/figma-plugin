# Export pipeline (Figma → tokens)

All of this is in `src/common/`, so it applies equally to plugin, CLI and API. The user-facing description is in [README.md](../../README.md). This file is the implementation map: which function decides what, and where to change it.

## Settings (`ExportSettingsI`, global.d.ts)

| Field                                        | Default                                              | Read by                                                                               |
| -------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `colorMode`                                  | `'hex'`                                              | `convertRGBA`, `normalizeComposedColor`, effect/color styles                          |
| `useDTCG`                                    | `true`                                               | `getTokenKeyName` (`$value` vs `value`), `makeDimension`, `makeDuration`, meta `spec` |
| `includeScopes`                              | `false`                                              | `variablesToTokens` (adds `scopes`)                                                   |
| `includeValueStringKeyToAlias`               | `false`                                              | `getAliasVariableName` (`{a.b.$value}` / `{a.b.value}`)                               |
| `includeFigmaMetaData`                       | `false`                                              | `variablesToTokens` (`$extensions.figma`)                                             |
| `usePercentageOpacity`                       | `false`                                              | `normalizeValue`, `normalizeType`, `normalizeComposedColor`                           |
| `expandEasingPresets`                        | `true`                                               | `normalizeEasing`                                                                     |
| `omitCollectionNames`                        | `false`                                              | `variablesToTokens`, `getAliasVariableName`, style converters                         |
| `includedStyles.{text,effects,grids,colors}` | `{ isIncluded: false, customName: '<Type>-styles' }` | `stylesToTokens`                                                                      |
| `storeStyleInCollection`                     | `'none'`                                             | `mergeStylesIntoTokens`                                                               |
| `splitByMode` / `splitByCollection`          | `false`                                              | `getTokens` (shape of the result), `splitTokensIntoFiles`                             |
| `omitCreatedAt`                              | `false` (optional field)                             | `buildMeta`                                                                           |

## `getTokens(resolver, config)` (src/common/export.ts)

1. `collections = resolver.getLocalVariableCollections()`, `variables = resolver.getLocalVariables()`
2. `variableTokens = variablesToTokens(variables, collections, config, resolver)` → `{ [collectionName]: nestedTree }`, or a flat nested tree with `omitCollectionNames`
3. `styleTokens = stylesToTokens(config, resolver)` → array of `{ [customName]: nestedTree }` in the order text, grids, effects, colors
4. `mergeStylesIntoTokens(variableTokens, styleTokens, storeStyleInCollection)`: `'none'` → style groups become top-level keys; otherwise they are `Object.assign`ed into that collection's group. A missing collection falls back to the top level with a warning, and `omitCollectionNames` always keeps them separate
5. `meta = { useDTCG, spec?, colorMode, variableCollections: names[], createdAt? }`
6. Result shape:
   - **splitByMode** (wins over splitByCollection): `{ "Collection/Mode": tree }`. Mode names come from `$extensions.mode` keys; `applyModeToTokens` replaces each `$value` with that mode's value and drops `$extensions.mode`. A top-level group without modes stays a single `"Collection"` entry. ⚠️ It only finds tokens by the `$value` key, so with `useDTCG: false` nothing is split by mode (documented: "Splitting by mode needs the DTCG format").
   - **splitByCollection**: `{ "Collection": tree }`
   - Each split entry gets its own `$extensions['tokens-bruecke-meta']`. Otherwise it is added once at the root: `tree.$extensions['tokens-bruecke-meta']`.
   - Style groups are top-level keys too, so they become their own "collection" files when splitting.

`splitTokensIntoFiles(tokens, { splitByCollection, splitByMode, targetIsFolder }, target)` (transform/splitTokensIntoFiles.ts) turns that into `[{ path, content }]`:

- Not split → one file: `target || 'design.tokens.json'`, content = the whole tree.
- Split → each file is `{ [collection]: tree }` at `<folder>/<Collection>.tokens.json` or `<folder>/<Collection>/<Mode>.tokens.json`. `safeName` replaces `/ \ ? % * : | " < >` with `-`. A `*.json` target is turned into its parent folder unless `targetIsFolder` (the CLI sets it, so the folder `v1.2` survives). The CLI keeps absolute paths; repo paths (servers) lose leading slashes.

## Variables → tokens (transform/variablesToTokens.ts)

**Ordering.** Variables are sorted by their index in the `variableIds` of the (non-extension) collections, which is Figma's Variables-panel order. Unknown ids go last. REST mode sorts collections and `variableIds` by name first (in the resolver), so its order is alphabetical.

**Per variable** (`addVariable`):

- `valuesByMode = valuesByModeOf(variable)`; mode ids are sorted by `collection.modes` order.
- Default value = the value of `collection.defaultModeId`.
- `modesValues = { [modeName]: value }`. If there is only one mode it becomes `{}`, so `$extensions.mode` is **always present** (possibly empty).
- Type = `normalizeType(resolvedType, scopes, usePercentageOpacity, rawDefaultValue, expandEasingPresets)`. For `EASING`, an alias chain is followed first (`resolveAliasedValue`, max depth 10) because the preset decides the type.
- Token object (key names from `getTokenKeyName(useDTCG)`):
  ```
  { $type, $value, $description, scopes?, $extensions: { mode, figmaType?: 'EASING', figma?: { codeSyntax, variableId, collection: { id, name, defaultModeId } } } }
  ```
  `$extensions` is always written with the `$` prefix, even when `useDTCG` is false.
- Placed at `tree[collectionName][variable.name]`; finally `groupObjectNamesIntoCategories` splits names on `/` into nested groups. If a token and a group share a path (`border/brand` and `border/brand/subtle`), they are merged rather than overwritten.
- **Errors:** any throw in `addVariable` → `warn(resolver, '[tokens-bruecke] Skipped variable "<name>" (<type>): <msg>. Values: <json>')`, and the variable is left out.

**omitCollectionNames:** everything goes into one flat map; on a duplicate name the last one wins, with a collision warning. Extended collections are skipped with a warning.

### Type mapping (transform/normalizeType.ts)

| Figma `resolvedType` | Condition                                                      | `$type`                                           |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------------- |
| `COLOR`              |                                                                | `color`                                           |
| `FLOAT`              | scopes exactly `['FONT_WEIGHT']`                               | `fontWeight`                                      |
| `FLOAT`              | every scope is `OPACITY` or `COLOR_OPACITY` (`isOpacityScope`) | `number`, or `string` with `usePercentageOpacity` |
| `FLOAT`              | otherwise                                                      | `dimension`                                       |
| `STRING`             | scopes exactly `['FONT_WEIGHT']` / `['FONT_FAMILY']`           | `fontWeight` / `fontFamily`                       |
| `STRING`             | otherwise                                                      | `string`                                          |
| `BOOLEAN`            |                                                                | `boolean`                                         |
| `TIMING`             |                                                                | `duration`                                        |
| `EASING`             | `normalizeEasing(value).type`                                  | `cubicBezier` or `string`                         |
| anything else        |                                                                | `string`                                          |

### Value mapping (transform/normalizeValue.ts)

Checked in this order:

1. **Alias** `{ type: 'VARIABLE_ALIAS', id }` → `getAliasVariableName` → `"{Collection.group.name}"` (dots replace `/`). With `includeValueStringKeyToAlias` it gets a `.$value` / `.value` suffix; with `omitCollectionNames` there is no collection prefix. A target missing from the resolver → `"#missing#"` plus a `[tokens-bruecke] Cannot find variable <id>` warning (expected for library variables).
2. **Composed color** (Figma "Control opacity at scale", Sept 2026): `{ color, opacity }` or the legacy `{ type: 'VARIABLE_EXPRESSION', expressionFunction: 'COMPOSE_COLOR', expressionArguments }` → `normalizeComposedColor` (color/composeColor.ts):
   - aliased base → `{ components: "{ref}", alpha: 0.5 | "50%" | "{opacityRef}" }`
   - literal base and literal opacity → a normal color value with the opacity as alpha
   - literal base and aliased opacity → the color in `colorMode` with `alpha` (DTCG modes) or `a` (object modes) set to the reference, or `{ components: <string color>, alpha }` for string modes
3. `COLOR` → `convertRGBA(value, colorMode)`. A value without numeric `r` throws `Unsupported color value: …`, so the variable is skipped and reported.
4. `FLOAT`: font weight → `Number(v)`; opacity scope → `"${v}%"` or `v / 100`; otherwise `makeDimension(round6(v), useDTCG)` → `{ value, unit: 'px' }` or `"6px"`.
5. `TIMING` → `makeDuration(seconds, useDTCG)` → `{ value: ms, unit: 'ms' }` or `"300ms"` (rounded to 3 decimals to remove float32 noise).
6. `EASING` → `normalizeEasing(value, expandEasingPresets).value`.
7. Otherwise (`STRING`, `BOOLEAN`) the raw value.

The type comes from the variable itself, not from an alias target: an aliased FLOAT with `ALL_SCOPES` is a `dimension` whose `$value` is `"{…}"`.

### Colors (transform/color/convertRGBA.ts)

`normalizeRGBAColor` first maps 0..1 floats to 0..255 integers and rounds alpha to 2 decimals (missing alpha → 1).

| `colorMode`   | Output                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `hex`         | `#rrggbb`, or `#rrggbbaa` when alpha ≠ 1                                                             |
| `rgba-css`    | `rgb(r, g, b)` when alpha = 1, else `rgba(r, g, b, a)`                                               |
| `rgba-object` | `{ r, g, b, a }` with **0..255** channels                                                            |
| `srgb-dtcg`   | `{ colorSpace: 'srgb', components: [r/255, g/255, b/255], alpha, hex }`                              |
| `hsla-css`    | `hsla(h, s%, l%, a)`                                                                                 |
| `hsla-object` | `{ h, s, l, a }` (s, l in 0..100)                                                                    |
| `hsl-dtcg`    | `{ colorSpace: 'hsl', components: [h, s, l], alpha, hex }`                                           |
| `oklch-dtcg`  | `{ colorSpace: 'oklch', components: [L(4 sig.), C(4 sig.), h(5 sig.)], alpha, hex }` (rgbToOKLCH.ts) |

To add a color mode, see [recipes.md](recipes.md#add-a-color-mode).

### Motion (transform/motion.ts)

- `EASING_PRESET_BEZIERS`: curves for LINEAR, EASE_IN/OUT/IN_AND_OUT and the three BACK presets.
- `EASING_PRESET_NAMES`: readable names (`ease-in`, `gentle`, `hold`, …).
- `normalizeEasing`: custom bezier → `cubicBezier` (rounded to 6 decimals); custom spring → `"spring(bounce 0.35)"`; bezier preset → curve if `expandEasingPresets` (prefers `easingFunctionCubicBezier` attached by Figma over the table), otherwise its name; springs and HOLD → name. String easings get `$extensions.figmaType: 'EASING'` so the import can recreate an EASING variable.
- The inverse functions `parseDurationToSeconds` and `parseEasing` (preset match with tolerance 0.02) are used by the import.

### Extended collections (transform/extendedCollections.ts)

Collections with `isExtension: true` own no variables. For each extension, `variablesToTokens` adds an entry for every id in `extension.variableIds`:

- `createExtensionValuesByMode`: variables of the root collection get `resolveExtendedValuesByMode`, which walks the chain extension → … → root. The nearest non-null `variableOverrides[varId][modeId]` wins; mode mapping uses `parentModeId`, then the mode name, then the mode index.
- `createExtensionResolver`: `getVariableCollectionById(rootId)` returns the extension itself, so aliases into the root are named after the extension (`{Regional.color.brand}`).
- Variables missing locally (extension of a library collection) → skipped with a warning.

## Styles → tokens (transform/styles/)

Each converter turns one style at a time in a try/catch: a style that throws is left out with `warnSkippedStyle` (`[tokens-bruecke] Skipped style "<name>": <reason>`), as for variables. Every style converter returns `{ [customName]: groupObjectNamesIntoCategories({ [style.name]: token }) }`. Style aliases use `getAliasVariableName` with the same `omitCollectionNames` as variables (passed down by `stylesToTokens`).

| Style  | File                      | Token                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Text   | `textStylesToTokens.ts`   | `typography` with `fontFamily`, `fontWeight` (bound alias, then exact `fontWeight`, then `fontName.variationSettings.wght`, then parsed from the font style string `fontName.style`, e.g. "Bold Italic", by `getFontStyleAndWeight`), `fontStyle`, `fontSize`, `lineHeight` (px rounded / `"150%"` / `"auto"`), `letterSpacing` (px / `"%"`), `paragraphSpacing`, `paragraphIndent`, `textDecoration`, `textCase`; `$description`; `$extensions.styleId`. Bound variables replace values with alias strings. |
| Paint  | `colorStylesToTokens.ts`  | Exactly one `SOLID` paint → `color` (alias if `boundVariables.paints[0]`, alpha = paint opacity). First paint a gradient → `gradient` with `[{ color, position }]` stops (alias per stop) plus `$extensions.gradient: { type, angle? }` (`getGradientGeometry`; angle only for linear, from `gradientHandlePositions` (REST) or the inverted `gradientTransform` (plugin)). Anything else (images, several solids, empty) is skipped with a `[tokens-bruecke] Skipped style` warning.                        |
| Effect | `effectStylesToTokens.ts` | The first effect's type decides, and effects of the other kind are left out with a warning. Shadows → `shadow` with an **array** of `{ inset, color, offsetX, offsetY, blur, spread }` (each can be an alias; a REST-omitted spread defaults to 0). Blur → `{ $type: 'blur', $value: { role: 'layer' \| 'background', blur } }` (keys follow `useDTCG`), first blur only.                                                                                                                                    |
| Grid   | `gridStylesToTokens.ts`   | `grid`: the first `COLUMNS` grid (or else the first `GRID`) → `column{Count,Gap,Width,Margin}`, the first `ROWS` grid → `row{Count,Gap,Height,Margin}`; sizes of 0 are kept, an `Infinity` (Auto) count is left out.                                                                                                                                                                                                                                                                                         |

Dimensions in styles use `makeDimension(…, useDTCG)`, so they become `{ value, unit: 'px' }` objects in DTCG mode. One exception: with `useDTCG: false`, text `paragraphSpacing` and `paragraphIndent` are unitless strings (`"8"`, not `"8px"`).

## Token tree conventions

- DTCG on: `$type`, `$value`, `$description`, `$extensions`. DTCG off: `type`, `value`, `description`, but still `$extensions`.
- Groups are plain objects; a token is an object with a `$value`/`value` key.
- Root meta: `$extensions['tokens-bruecke-meta'] = { useDTCG, spec?: 'https://www.designtokens.org/tr/2025.10/format/', colorMode, variableCollections, createdAt? }`.
- Non-DTCG `$type`s are still written: `number`, `string`, `boolean`, `grid`, `blur`, and `fontWeight` as a string from STRING variables.

## Other helpers

| File                                 | Purpose                                                 | Used by           |
| ------------------------------------ | ------------------------------------------------------- | ----------------- |
| `getTokensStat.ts`, `countTokens.ts` | lines / groups / tokens / bytes for the preview toolbar | `CodePreviewView` |
