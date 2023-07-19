# VARIABLES EXPORT

## What plugin is doing?

It converts Figma variables into design-tokens JSON that are compatible with the latest [Design Tokens specification](https://design-tokens.github.io/community-group/format/).

## Tokens structuring

Plugin first takes the collection name, then mode name and then variable name. For example, if you have a collection named `Colors`, mode named `Light` and variable named `Primary`, the plugin will generate the following JSON:

```json
{
  "Colors": {
    "Light": {
      "Primary": "#000000"
    }
  }
}
```

Figma automatically merge groups and their names into a single name, e.g. `Base/Primary/10`. In this case, the plugin will generate the following JSON:

```json
{
  "Base": {
    "Primary": {
      "10": "#000000"
    }
  }
}
```

## Aliases handling

All aliases are converted into the alias string format from the [Design Tokens specification](https://design-tokens.github.io/community-group/format/#aliases-references).

## Types conversion

Unlike design tokens, Figma variables now support only 4 types: `COLOR`, `BOOLEAN`, `FLOAT`, `STRING`. So, the plugin converts them into the corresponding types from the [Design Tokens specification](https://design-tokens.github.io/community-group/format/#types).

| Figma type | Design Tokens type                                                                  |
| ---------- | ----------------------------------------------------------------------------------- |
| COLOR      | [color](https://design-tokens.github.io/community-group/format/#color)              |
| BOOLEAN    | _boolean_ \*                                                                        |
| FLOAT      | [dimension](https://design-tokens.github.io/community-group/format/#dimension) \*\* |
| STRING     | _string_ \*                                                                         |

\* native JSON types. The specification doesn't restrict the type of the value, so it could be any JSON type. Also see [this issue](https://github.com/design-tokens/community-group/issues/120#issuecomment-1279527414).

\*\* currently figma supports only the `FLOAT` type for dimensions, that could be used only for `px` values. So, the plugin converts `FLOAT` values into `dimension` type with `px` unit.

## Design Tokens types

In order to validate your JSON file, you can use TS types from this repo: [design-tokens-types](https://github.com/PavelLaptev/design-tokens-types).

## Settings

### Names transform

Allows you to transform

## Scope

Scope types https://www.figma.com/plugin-docs/api/VariableScope

## Styles

## Effects

### Shadows

Currently the specification supports only `drop-shadow` effect. But in order to support `inset` shadows, the `inset` property will be added to the `shadow` object.

### WHY THERE IS NO SUPPORT FOR COLLORS?

Because.

### GRADIENTS

Currect design tokens implementation doesnt' have a support for non-linear gradients, also it doesnt support the `angle` property.

iisue: [https://github.com/design-tokens/community-group/issues/101](https://github.com/design-tokens/community-group/issues/101)

## TODO:

- Describe restrictions
- Show current JSON implementation

## GRIDS

If you have multiple grid layouts, the plugin will take only first two and treat the first one as `column` grid and the second one as `row` grid.

Link to the grid token repo: here

# USE DTCG key format ($)

Read more about DTCG [characters restrictions](https://design-tokens.github.io/community-group/format/#character-restrictions)

## CHANGELOG

### 1.0.0

- Initial release

### 1.0.1

- Fixed Aliases handling. Removed `mode` from the alias string if there is only one mode in the collection.

### 1.0.2

- Fixed RGBA to HEXA conversion
- Added color styles support
- Added basic support for linear and radial gradients

### 1.0.3

- HEX color fixed
- Alias variables fixed
