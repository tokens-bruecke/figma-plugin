# Changelog

## 2.5.0

- [Introduce CLI Based tool that uses Figma Rest API](https://github.com/tokens-bruecke/figma-plugin/pull/33) _by [Sylvain Marcadal](https://github.com/r1m)_ (not yet published to NPM)
- [Fix: support font style strings like "Semi Bold"](https://github.com/tokens-bruecke/figma-plugin/pull/36) _by [Peter Lazar](peterlazar1993)_
- [Fix: precision errors for floats](https://github.com/tokens-bruecke/figma-plugin/pull/37) _by [Peter Lazar](peterlazar1993)_

## 2.4.0

- [Add font style support for italic](https://github.com/tokens-bruecke/figma-plugin/pull/35) _by [Sylvain Marcadal](https://github.com/r1m)_
- [Add support for selfhosted gitlab](https://github.com/tokens-bruecke/figma-plugin/pull/34) _by [Sylvain Marcadal](https://github.com/r1m)_

## 2.3.1

- [Fixes dimension type for vars with single scope](https://github.com/tokens-bruecke/figma-plugin/pull/31)

## 2.3.0

- Added `codeSyntax` property to variables. See this PR — [include variable's "codeSyntax" property in exported token json](https://github.com/tokens-bruecke/figma-plugin/pull/28)

## 2.2.3

- Convert `OPACITY` scope to valid value using this formula `value / 100`.

## 2.2.2

- Do not convert the value to PX units if the variable scope is `FONT_WEIGHT`

## 2.2.1

- Added `paragraphSpacing` and `paragraphIndent` to the typography styles

## 2.2.0

- Added aliases handling for typography styles — [Related issue](https://github.com/tokens-bruecke/figma-plugin/issues/24)
- Added aliases handling for effects

## 2.1.4 and 2.1.5

- Fix wrong font weight output. Related PR — [Right the heuristic wrongs](https://github.com/tokens-bruecke/figma-plugin/pull/20). _by [@JeroenRoodIHS](https://github.com/JeroenRoodIHS)_

## 2.1.3

- Fixed font weights to be numbers. Related PR — [Font weights fix - output as numbers (DTCG format)](https://github.com/tokens-bruecke/figma-plugin/pull/22)

## 2.1.2

- Updated the function to generate text styles. Related PR — [Update textStylesToTokens.ts ](https://github.com/tokens-bruecke/figma-plugin/pull/19)

## 2.1.1

- `$meta` tag moved to `$extensions` object. See issue — [$meta is not valid DTCG](https://github.com/tokens-bruecke/figma-plugin/issues/13)

## 2.1.0

- Multiple `Shadow` and `Blur` styles support added. [Link to the PR](https://github.com/tokens-bruecke/figma-plugin/issues/11)

## 2.0.0

- tokens structure was changed. All modes now moved from variable names into `$extensions/modes` object. In order to make it work with [Cobalt](https://cobalt-ui.pages.dev/guides/modes#with-modes). For morre details see this issue — [Multiple collection and modes](https://github.com/tokens-bruecke/figma-plugin/issues/7). Previous implementation didn't work correctly with multiple modes and aliasees.

## 1.6.0

- `value` string for aliases is now optional

## 1.5.0

- Added `GitHub PR` option to the `Push to server` feature
- `Connect server` renamed to `Push to server`
- _Thanks for contribution to [@distolma](https://github.com/distolma)_

## 1.4.0

- Added `warning` type to the `Toast` component
- structure refactoring
- code refactoring
- updated `Github` errors handling
- added `value` to all aliases at the end of the path. Also support for `DTCG` keys format added
- added storage versioning
- updated DTCG format switching
- added `Copy` button for the tokens preview

## 1.3.0

- Functions names refactoring

## 1.2.0

- Updated method to check `VARIABLE_ALIAS` in `normalizeValue` function
- Handle aliases from another files
- Removed the property `aliasPath` from `$extensions` object, since it's not needed anymore

## 1.1.1

- Updated errors handling for GitHub server

## 1.1.0

- `Update` button animation added
- added token types as a separate package

## 1.0.9

- Fixed `line-height` value conversion. It wasn't rounded to the nearest integer.

## 1.0.8

- Fix for [Reference tokens auto-referencing themselves in the exported JSON](https://github.com/PavelLaptev/tokens-bruecke/issues/1)

## 1.0.7

- Code cleanup

## 1.0.6

- WIP [Reference tokens auto-referencing themselves in the exported JSON](https://github.com/PavelLaptev/tokens-bruecke/issues/1)

## 1.0.5

- Allowed to use plugin in files without variables

## 1.0.4

- Fix scopes conversion
- `$meta` info adding order fixed

## 1.0.3

- HEX color fixed
- Alias variables fixed

## 1.0.2

- Fixed RGBA to HEXA conversion
- Added color styles support
- Added basic support for linear and radial gradients

## 1.0.1

- Fixed Aliases handling. Removed `mode` from the alias string if there is only one mode in the collection.

## 1.0.0

- Initial release
