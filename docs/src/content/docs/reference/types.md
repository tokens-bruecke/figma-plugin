---
title: "Types and scopes"
description: "How Figma variable types, motion variables and scopes map to design token types."
---

## Variables types conversion

Unlike design tokens, Figma variables [support only 6 types](https://www.figma.com/plugin-docs/api/VariableResolvedDataType) — `COLOR`, `BOOLEAN`, `FLOAT`, `STRING`, `TIMING` and `EASING`. So, the plugin converts them into the corresponding types from the [DTCG 2025.10 specification](https://www.designtokens.org/tr/2025.10/format/#types).

| Figma type | Scope condition         | Design Tokens type                                                                               |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| COLOR      | —                       | [color](https://www.designtokens.org/tr/2025.10/format/#color)                                   |
| BOOLEAN    | —                       | _boolean_ \*                                                                                     |
| FLOAT      | only `FONT_WEIGHT`      | [fontWeight](https://www.designtokens.org/tr/2025.10/format/#font-weight)                        |
| FLOAT      | opacity scopes (no %)   | _number_ \*                                                                                      |
| FLOAT      | opacity scopes (with %) | _string_ (e.g. `"10%"`) \*                                                                       |
| FLOAT      | all other scopes        | [dimension](https://www.designtokens.org/tr/2025.10/format/#dimension) \*\*                      |
| STRING     | only `FONT_WEIGHT`      | [fontWeight](https://www.designtokens.org/tr/2025.10/format/#font-weight)                        |
| STRING     | only `FONT_FAMILY`      | [fontFamily](https://www.designtokens.org/tr/2025.10/format/#font-family)                        |
| STRING     | all other scopes        | _string_ \*                                                                                      |
| TIMING     | —                       | [duration](https://www.designtokens.org/tr/2025.10/format/#duration) \*\*\*                      |
| EASING     | —                       | [cubicBezier](https://www.designtokens.org/tr/2025.10/format/#cubic-bezier) or _string_ \*\*\*\* |

\* native JSON types — not part of the closed DTCG 2025.10 type set. The plugin still writes them as the token's `$type`. "Opacity scopes" means every scope of the variable is `OPACITY` or `COLOR_OPACITY`, see [Scopes limitations](#scopes-limitations). Also see [this issue](https://github.com/design-tokens/community-group/issues/120#issuecomment-1279527414).

\*\* Figma currently supports only `FLOAT` for numeric values used as dimensions, which map to `px` units. With the DTCG 2025.10 format on, dimensions are exported as `{ "value": 6, "unit": "px" }` objects; otherwise the plugin appends `px` to the number.

\*\*\* Figma stores timings in seconds; the plugin converts them to milliseconds. With the DTCG 2025.10 format on, durations are exported as `{ "value": 300, "unit": "ms" }` objects; otherwise the plugin appends `ms` to the number.

\*\*\*\* See [Motion variables](#motion-variables) below.

## Motion variables

Figma's `EASING` variables hold either a custom curve or one of Figma's presets. DTCG only has a `cubicBezier` type, so the plugin maps them like this:

| Figma easing                                                                        | Token type    | Example value           |
| ----------------------------------------------------------------------------------- | ------------- | ----------------------- |
| Custom bezier                                                                       | `cubicBezier` | `[0, 0, 0.58, 1]`       |
| Linear, Ease in / out / in and out, Ease in / out / in and out back                 | `cubicBezier` | `[0.42, 0, 1, 1]`       |
| Linear, Ease in / out / in and out, Ease in / out / in and out back — expansion off | `string`      | `"ease-in"`             |
| Gentle, Quick, Bouncy, Slow                                                         | `string`      | `"gentle"`              |
| Custom spring                                                                       | `string`      | `"spring(bounce 0.35)"` |
| Hold                                                                                | `string`      | `"hold"`                |

Named bezier presets are expanded into curves unless [Expand easing presets to cubic-bezier](../../plugin/advanced-settings/#expand-easing-presets-to-cubic-bezier) is turned off. Springs and Hold are always names: DTCG has no spring type, and Figma exposes no numbers for them.

All of these forms are read back on import, so a round trip through the plugin preserves the original preset. Expanded curves are matched back to the preset they came from, and easings exported as strings carry an `$extensions.figmaType: "EASING"` marker so they are recreated as `EASING` variables rather than `STRING` ones.

:::note
The curves of the named bezier presets are the ones Figma attaches to the preset in the Plugin API; if one of them does not match what you see in your file, please [open an issue](https://github.com/tokens-bruecke/figma-plugin/issues).
:::

## Design tokens types

In order to validate types, the plugin uses the [Design Tokens types](https://github.com/tokens-bruecke/figma-plugin/blob/main/plugin-types.d.ts).

## Scopes limitations

Figma variables have no font weight, font family or opacity type, so the plugin reads the variable's scopes to pick the token type:

- A number or string variable whose only scope is `FONT_WEIGHT` becomes a `fontWeight` token. With any other scope next to it, it stays a `dimension` or `string`.
- A string variable whose only scope is `FONT_FAMILY` becomes a `fontFamily` token. With any other scope next to it, it stays a `string`.
- A number variable whose scopes are all `OPACITY` or `COLOR_OPACITY` (the opacity of a color variable) becomes a `number` token, or a `string` with `%` if [Use percentage for opacity](../../plugin/advanced-settings/#use-percentage-for-opacity) is enabled. With any other scope next to them, it is exported as a `dimension`.
