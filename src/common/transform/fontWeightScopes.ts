/**
 * `FONT_VARIATIONS` is the scope for variable font axes. Figma reports it next
 * to `FONT_WEIGHT` when a number variable is scoped to font weight, so a font
 * weight variable can come back as `['FONT_WEIGHT', 'FONT_VARIATIONS']`. It is
 * not in `@figma/plugin-typings` yet, hence the cast.
 */
export const FONT_VARIATIONS_SCOPE = 'FONT_VARIATIONS' as VariableScope;

const FONT_WEIGHT_SCOPES: ReadonlyArray<string> = [
  'FONT_WEIGHT',
  FONT_VARIATIONS_SCOPE,
];

/**
 * True when a variable is a font weight: its scopes include `FONT_WEIGHT` and
 * nothing else but `FONT_VARIATIONS`. Any other scope next to it (e.g.
 * `WIDTH_HEIGHT`) makes the meaning unclear, so such a variable is left to
 * the other checks.
 */
export const isFontWeightScope = (
  scopes: ReadonlyArray<string> | undefined
): boolean =>
  Array.isArray(scopes) &&
  scopes.includes('FONT_WEIGHT') &&
  scopes.every((scope) => FONT_WEIGHT_SCOPES.includes(scope));
