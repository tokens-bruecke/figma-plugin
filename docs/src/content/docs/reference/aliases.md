---
title: "Aliases"
description: "How aliases, color aliases with opacity, library variables and modes are handled."
---

All aliases are converted into the alias string format from the [Design Tokens specification](https://design-tokens.github.io/community-group/format/#aliases-references).

```json
{
  "button": {
    "background": {
      "type": "color",
      "value": "{colors.primary.10}"
    }
  }
}
```

References use `.` as separator, so DTCG forbids `.`, `{` and `}` in token and group names. A collection whose name contains them, like `1. Primitives`, is exported as `1- Primitives`, with a warning; the meta keeps the original name, and the [import](../../getting-started/export-and-import/#import-json--variables) uses it to recreate the collection under its Figma name.

## Include `.value` string for aliases

You can switch on the `Include .value string for aliases` option in [the plugin settings](../../plugin/advanced-settings/#include-value-string-for-aliases).

## Color aliases with opacity

Since September 2026 Figma lets a color variable alias another color and apply its own opacity on top ("Control opacity at scale"). The opacity can be a plain percentage or a number variable with the `COLOR_OPACITY` scope.

The [DTCG color type](https://www.designtokens.org/tr/2025.10/color/#format) has no way to express "this color, with that opacity" while keeping the reference, so the plugin exports these variables as a composite value: `components` holds the reference to the base color and `alpha` holds the opacity, as a `0..1` number (or `"50%"` with [Use percentage for opacity](../../plugin/advanced-settings/#use-percentage-for-opacity)) or a reference to the number variable driving it.

```json
{
  "opacity": {
    "50": { "$type": "number", "$value": 0.5, "scopes": ["COLOR_OPACITY"] }
  },
  "color": {
    "brand": {
      "$type": "color",
      "$value": {
        "colorSpace": "srgb",
        "components": [0.2, 0.4, 0.8],
        "alpha": 1,
        "hex": "#3366cc"
      }
    },
    "brand-translucent": {
      "$type": "color",
      "$value": { "components": "{color.brand}", "alpha": 0.5 }
    },
    "brand-muted": {
      "$type": "color",
      "$value": { "components": "{color.brand}", "alpha": "{opacity.50}" }
    }
  }
}
```

The `alpha` is the opacity Figma applies on top of the referenced color. If the base color is a literal rather than an alias, the opacity is baked into the regular color value for the chosen [color mode](../../plugin/settings/#color-mode); only when the opacity itself is a reference does the color value keep an `alpha` (or `a`) reference in place of the number.

[Importing](../../getting-started/export-and-import/#import-json--variables) these tokens recreates the composed color variable in Figma: `components` becomes the alias, `alpha` the opacity (a plain percentage or an alias to the number variable). References to variables in other collections are resolved once every collection has been imported.

Figma has exposed these variables to plugins in two shapes so far: current runtimes (the Figma web app, and what `setValueForMode` accepts) use `{ "color": <alias or rgba>, "opacity": <0..100 or alias> }`, while Figma Desktop 126.x returned a `COMPOSE_COLOR` expression. The export reads both. The import writes the current shape and falls back to the expression for runtimes that only accept that one.

:::caution
Older Figma clients, including Figma Desktop 126.x, can read these variables but refuse to write them in either shape ("Composed color variable values are not supported"). Figma has since enabled writing them through the Plugin API ([figma/plugin-typings#375](https://github.com/figma/plugin-typings/issues/375)), so update Figma if the import skips them. On an outdated client the plugin leaves those values untouched, reports how many were skipped and asks you to update Figma. Other tokens in the same import are not affected.
:::

:::note
Figma is still changing how these values are exposed to plugins. If a color variable comes back in a shape the plugin does not recognise, the export leaves that variable out and logs a `[tokens-bruecke] Skipped variable …` warning with the raw value to the Figma console (`Plugins → Development → Open console`) instead of failing. Please paste that warning into [#91](https://github.com/tokens-bruecke/figma-plugin/issues/91).
:::

:::note
This shape is an extension of the DTCG format, so a consumer needs a small custom transform: resolve the `components` reference, then apply `alpha`.
:::

## Handle variables from another file

Imagine you have a library from another file with "base" variables. And you use this variables in your current file.

The plugin will generate the alias name anyway, but it will be a path to the variable as if it was in the current file.

```json
{
  "button": {
    "background": {
      "type": "color",
      "value": "{colors.primary.10}"
    }
  }
}
```

The plugin wouldn't include the variable into the generated JSON in order to avoid duplicates or conflicts with JSON files you can generate from another Figma files. The CLI and the library API do the same in REST mode. In snapshot mode, add the library variables and their collections with `"remote": true`: they resolve aliases but aren't exported.

So you will need to merge the file with the base variables from one file with another where you use them. Otherwise tools like Style Dictionary wouldn't be able to resolve the aliases.

## Handle modes

If there is only one mode, the mode values are left out: `$extensions.mode` is an empty object.
If there are multiple modes, the plugin will place them under the `$extensions` objects.

It follows the same pattern as used by [Cobalt](https://cobalt-ui.pages.dev/guides/modes#with-modes)
