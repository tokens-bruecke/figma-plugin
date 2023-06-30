# VARIABLES EXPORT

## What plugin is doing?

It converts Figma variables into design-tokens JSON that are compatible with the latest [Design Tokens specification](https://design-tokens.github.io/community-group/format/).

## Structuring

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

## Aliases

All aliases are converted into the alias string format from the [Design Tokens specification](https://design-tokens.github.io/community-group/format/#aliases-references).

## Types conversion

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
