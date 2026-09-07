import Decimal from 'decimal.js';
import { convertRGBA } from './convertRGBA';

/**
 * Figma's "Control opacity at scale" release (September 2026) lets a color
 * variable alias another color and apply its own opacity on top, optionally
 * driven by a number variable. The Plugin API returns such values as an
 * expression rather than a plain alias or RGBA:
 *
 * ```js
 * {
 *   type: 'VARIABLE_EXPRESSION',
 *   expressionFunction: 'COMPOSE_COLOR',
 *   expressionArguments: [
 *     { type: 'VARIABLE_ALIAS', id: '…' } | { r, g, b, a },
 *     50 | { type: 'VARIABLE_ALIAS', id: '…' },
 *   ],
 * }
 * ```
 *
 * The first argument is the base color, the second the opacity in percent
 * (0..100) or an alias to a FLOAT variable holding it.
 */
export interface ComposedColorValue {
  type: 'VARIABLE_EXPRESSION';
  expressionFunction: 'COMPOSE_COLOR';
  expressionArguments: [RGBA | VariableAlias, number | VariableAlias];
}

export const isComposedColor = (value: any): value is ComposedColorValue =>
  value?.type === 'VARIABLE_EXPRESSION' &&
  value.expressionFunction === 'COMPOSE_COLOR' &&
  Array.isArray(value.expressionArguments);

const isAlias = (value: any): value is VariableAlias =>
  value?.type === 'VARIABLE_ALIAS' && typeof value.id === 'string';

const DTCG_COLOR_MODES: ReadonlyArray<colorModeType> = [
  'srgb-dtcg',
  'hsl-dtcg',
  'oklch-dtcg',
];
const OBJECT_COLOR_MODES: ReadonlyArray<colorModeType> = [
  'rgba-object',
  'hsla-object',
];

interface PropsI {
  value: ComposedColorValue;
  colorMode: colorModeType;
  usePercentageOpacity: boolean;
  /** Turns a variable id into a `{collection.path}` reference string. */
  resolveAlias: (variableId: string) => Promise<string>;
}

/**
 * Converts a composed color into a token value.
 *
 * The DTCG color type has no way to express "this color, with that opacity"
 * when either half is a reference, so the value is emitted as a composite
 * object whose parts may be references (see README, "Color aliases with
 * opacity"):
 *
 * - base is an alias → `{ components: "{color.brand}", alpha: 0.5 | "{opacity.50}" }`
 * - base is a literal, opacity is a number → a regular color value with the
 *   opacity baked in as its alpha channel
 * - base is a literal, opacity is an alias → the regular color value for the
 *   chosen color mode, with its alpha replaced by the reference
 */
export const normalizeComposedColor = async ({
  value,
  colorMode,
  usePercentageOpacity,
  resolveAlias,
}: PropsI) => {
  const [baseColor, opacity] = value.expressionArguments;

  const alpha = isAlias(opacity)
    ? await resolveAlias(opacity.id)
    : normalizeOpacity(opacity, usePercentageOpacity);

  if (isAlias(baseColor)) {
    return { components: await resolveAlias(baseColor.id), alpha };
  }

  if (!isAlias(opacity)) {
    // Both halves are literal — Figma's opacity replaces the base alpha.
    return convertRGBA(
      { ...baseColor, a: new Decimal(opacity).div(100).toNumber() },
      colorMode
    );
  }

  const opaqueBase = convertRGBA({ ...baseColor, a: 1 }, colorMode);

  if (DTCG_COLOR_MODES.includes(colorMode)) {
    return { ...(opaqueBase as object), alpha };
  }
  if (OBJECT_COLOR_MODES.includes(colorMode)) {
    return { ...(opaqueBase as object), a: alpha };
  }
  return { components: opaqueBase, alpha };
};

/**
 * Figma stores the opacity as 0..100 percent; tokens use a 0..1 fraction
 * unless percentage opacity output is enabled (matching FLOAT opacity
 * variables).
 */
const normalizeOpacity = (opacity: number, usePercentageOpacity: boolean) => {
  if (usePercentageOpacity) {
    return `${opacity}%`;
  }
  return new Decimal(opacity).div(100).toNumber();
};
