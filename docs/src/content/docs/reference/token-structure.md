---
title: "Token structure"
description: "How collections, groups, variables and modes map to the JSON output, including extended collections."
---

Plugin first takes the `collection` name, then the `group` and then the `variable` name.
Mode variables will be wrapped under the `$extensions` objects

```text
Collection
└─ Group
   └─ Variable
      ├─ $value          value of the default mode
      └─ $extensions
         └─ mode
            ├─ Light     value in this mode
            └─ Dark      value in this mode
```

For example, if you have a collection named `clr-theme`, mode named `light` and variable named `dark`, the plugin will generate the following JSON:

```json
"clr-theme": {
  "container-outline/mid": {
    "type": "color",
    "value": "{clr-core.ntrl.40}",
    "description": "",
    "$extensions": {
      "mode": {
        "light": "{clr-core.ntrl.40}",
        "dark": "{clr-core.ntrl.55}"
      }
    }
  }
}
,
```

Figma automatically merges groups and their names into a single name, e.g. `Base/Primary/10`. In this case, the plugin will generate the following JSON:

```json
{
  "base": {
    "primary": {
      "10": {
        "type": "color",
        "value": "#000000"
      }
    }
  }
}
```

### Extended collections

Collections created with [Extend a variable collection](https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection) are exported as collections of their own. Figma stores only what an extension changes, so the export writes all the variables it inherits, with the overrides of its chain applied, which keeps every collection complete.

- The value of a variable is the closest override in the chain of extensions, or the value of the root collection when nothing overrides it. An override that was cleared falls through to the parent. Each mode follows the parent mode it inherits from, even when the extension renames it.
- Aliases to variables of the root collection point to the extension's own variable, so `{Core.color.brand}` becomes `{Regional.color.brand}` inside `Regional`. Aliases to other collections stay as they are.
- Extensions of a library collection are exported without the variables they inherit, because those live in the library file, not in yours. The export warns about them.
- With [Omit collection names](../../plugin/advanced-settings/#omit-collection-names) the extended collections are skipped with a warning, because they repeat the variables of their root collection and would collide in a single namespace.

```json
// "Regional" extends "Core" and overrides color/brand
{
  "Core": {
    "color": {
      "brand": { "type": "color", "value": "#ff0000" },
      "text": { "type": "color", "value": "{Core.color.brand}" }
    }
  },
  "Regional": {
    "color": {
      "brand": { "type": "color", "value": "#00ff00" },
      "text": { "type": "color", "value": "{Regional.color.brand}" }
    }
  }
}
```
