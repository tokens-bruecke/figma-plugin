/**
 * Scopes that mark a FLOAT variable as an opacity (0..100 percent) rather
 * than a dimension.
 *
 * `COLOR_OPACITY` was introduced with Figma's "Control opacity at scale"
 * release (September 2026): a number variable with this scope can drive the
 * opacity of a color variable. It is not part of the published
 * `VariableScope` typings yet, hence the plain-string list.
 */
export const OPACITY_SCOPES: ReadonlyArray<string> = [
  'OPACITY',
  'COLOR_OPACITY',
];

export const isOpacityScope = (
  scopes: ReadonlyArray<string> | undefined
): boolean =>
  Array.isArray(scopes) &&
  scopes.length > 0 &&
  scopes.every((scope) => OPACITY_SCOPES.includes(scope));
