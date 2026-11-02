---
title: "Styles support"
description: "How typography, color, grid, shadow and blur styles are exported."
---

The plugin can support some styles and effects too. Until Figma will support all the styles and effects, the plugin will convert them into the corresponding design tokens types. But it's not a backward compatibility, it's a temporary solution until Figma will support all the styles and effects as variables.

Supported styles:

- Typography
- Colors
- Grids
- Shadows (including `inset` shadows)
- Blur (including `background` and `layer` blur)

A style the plugin can't export, such as a color style with only image fills, is left out and the rest of the export continues. The plugin logs a `[tokens-bruecke] Skipped style …` warning to the console (`Plugins → Development → Open console`, or stderr for the CLI).

## Typography

```json
"extralight": {
  "type": "typography",
  "value": {
    "fontFamily": "Inter",
    "fontWeight": 400,
    "fontSize": "18px",
    "fontStyle": "normal",
    "lineHeight": "28px",
    "letterSpacing": "0%",
    "paragraphSpacing": "0",
    "paragraphIndent": "0",
    "textDecoration": "NONE",
    "textCase": "ORIGINAL"
  },
  "description": "",
  "$extensions": {
    "styleId": "S:0ffe98ad785a13839980113831d5fbaf21724594,"
  }
}
```

## Colors

The plugin supports solid colors and gradients (linear, radial, angular, diamond). Color styles are converted to DTCG format with support for variable aliases. A solid style bound to a color variable with its own opacity below 100% is exported like a [color alias with opacity](../aliases/#color-aliases-with-opacity): `{ "components": "{color.brand}", "alpha": 0.5 }`.

```json
// Solid color
"primary": {
  "type": "color",
  "value": "#ff0000"
}

// Solid color with variable alias
"secondary": {
  "type": "color",
  "value": "{colors.base.primary}"
}

// Gradient
"skeleton-ramp": {
  "type": "gradient",
  "value": [
    {
      "color": "{clr.scale.ntrl.80}",
      "position": 0
    },
    {
      "color": "{clr.scale.ntrl.95}",
      "position": 0.5
    },
    {
      "color": "#eae9e8",
      "position": 1
    }
  ],
  "$extensions": {
    "gradient": {
      "type": "linear",
      "angle": 180
    }
  }
}
```

DTCG has no direction or type for a gradient, only the stops, so they are exported in `$extensions.gradient`. `type` is `linear`, `radial`, `angular` or `diamond`. `angle` is only there for a linear gradient, in CSS degrees: `0` is to the top, `90` to the right and `180` to the bottom. It is taken from the handles of the gradient, which are relative to the layer, so it is exact for a gradient along an axis and an approximation for a diagonal one on a layer that is not square.

### Color styles with several paints

A token has a single value, so a color style with several paints takes its value from the top visible solid paint or gradient. The other paints are left out with a warning.

With [Include Figma metadata](../../plugin/advanced-settings/#include-figma-metadata) on, every paint of the style is also exported in `$extensions.figma.paints`, in Figma's order: from the bottom paint to the top one. Each paint has its `type`, `visible`, `opacity` and `blendMode`. A solid paint adds its `color`, without the paint's opacity, or the alias of its variable. A gradient adds its `stops`, its `gradient` type and angle, and the raw `gradientTransform`. An image adds its `imageHash` and `scaleMode`.

```json
"overlay": {
  "$type": "color",
  "$value": "#ff000080",
  "$extensions": {
    "figma": {
      "styleId": "S:4d3c…",
      "paints": [
        {
          "type": "GRADIENT_LINEAR",
          "visible": true,
          "opacity": 1,
          "blendMode": "NORMAL",
          "stops": [
            { "color": "#000000", "position": 0 },
            { "color": "#ffffff", "position": 1 }
          ],
          "gradient": { "type": "linear", "angle": 180 },
          "gradientTransform": [[0, 1, 0], [-1, 0, 1]]
        },
        {
          "type": "SOLID",
          "visible": true,
          "opacity": 0.5,
          "blendMode": "MULTIPLY",
          "color": "#ff0000"
        }
      ]
    }
  }
}
```

## Grids

In Figma you can add as many grids in the style as you want. The plugin exports the first `Columns` grid as `column*` values and the first `Rows` grid as `row*` values; further grids of the same kind are left out. A square `Grid` only has a cell size, which is exported as `columnWidth` when the style has no columns. Sizes of `0` are kept, and an `Auto` count is left out.

```json
// Column grid
"1024": {
  "type": "grid",
  "value": {
    "columnCount": 12,
    "columnGap": "20px",
    "columnMargin": "40px"
  }
}

// Row grid
"1024": {
  "type": "grid",
  "value": {
    "rowCount": 12,
    "rowGap": "20px",
    "rowMargin": "40px"
  }
}

// Both grids
"1024": {
  "type": "grid",
  "value": {
    "columnCount": 12,
    "columnGap": "20px",
    "columnMargin": "40px",
    "rowCount": 12,
    "rowGap": "20px",
    "rowMargin": "40px"
  }
}
```

## Shadows

The plugin supports `drop-shadow` and `inner-shadow` effects. If the effect is `inner-shadow`, the plugin will set the `inset` property to `true`. The value is always an array, even when the style has a single shadow.

The first effect of a style decides its type: a style that starts with a shadow is exported as a `shadow` token, and blur effects in it are left out with a warning. A style that starts with a blur is exported as a `blur` token.

```json
"xl": {
  "type": "shadow",
  "value": [
    {
      "inset": false,
      "color": "#0000000a",
      "offsetX": "0px",
      "offsetY": "10px",
      "blur": "10px",
      "spread": "-5px"
    }
  ]
}
```

## Blur

The plugin supports `background` and `layer` blur effects. In order to distinguish between them, the plugin adds the `role` property to the generated JSON. Only the first effect of a blur style is exported. Like all other tokens, blur tokens use the `$type` / `$value` keys with the [DTCG 2025.10 format](../../plugin/settings/#dtcg-202510-format) setting on, and `type` / `value` with it off.

```json
// Background blur
"sm": {
  "$type": "blur",
  "$value": {
    "role": "background",
    "blur": "4px"
  }
}

// Layer blur
"md": {
  "$type": "blur",
  "$value": {
    "role": "layer",
    "blur": "12px"
  }
}
```

## Multiple shadows support

If a shadow style has several shadows, the plugin exports all of them in the array.

```json
"new-sh": {
  "$type": "shadow",
  "$value": [
    {
      "inset": false,
      "color": "#e4505040",
      "offsetX": "0px",
      "offsetY": "4px",
      "blur": "54px",
      "spread": "0px"
    },
    {
      "inset": false,
      "color": "#5b75ff40",
      "offsetX": "0px",
      "offsetY": "4px",
      "blur": "24px",
      "spread": "0px"
    },
    {
      "inset": false,
      "color": "#00000040",
      "offsetX": "0px",
      "offsetY": "4px",
      "blur": "4px",
      "spread": "0px"
    }
  ]
}
```
