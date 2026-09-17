import Decimal from 'decimal.js';
import { convertRGBA } from './convertRGBA';

/**
 * Figma's "Control opacity at scale" release (September 2026) lets a color
 * variable alias another color and apply its own opacity on top, optionally
 * driven by a number variable. The Plugin API has exposed such values in two
 * shapes so far:
 *
 * ```js
 * // current runtimes (Figma web app, and what `setValueForMode` accepts)
 * {
 *   color: { type: 'VARIABLE_ALIAS', id: '…' } | { r, g, b, a },
 *   opacity: 50 | { type: 'VARIABLE_ALIAS', id: '…' },
 * }
 *
 * // earlier runtimes (Figma Desktop 126.x)
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
 * In both, the base is the color and the opacity is in percent (0..100) or
 * an alias to a FLOAT variable holding it. At least one half is an alias;
 * a literal color with a literal opacity is stored as a plain RGBA.
 */
export interface ComposedColorObject {
  color: RGB | RGBA | VariableAlias;
  opacity: number | VariableAlias;
}

export interface ComposedColorExpression {
  type: 'VARIABLE_EXPRESSION';
  expressionFunction: 'COMPOSE_COLOR';
  expressionArguments: [RGB | RGBA | VariableAlias, number | VariableAlias];
}

export type ComposedColorValue = ComposedColorObject | ComposedColorExpression;

const isAlias = (value: any): value is VariableAlias =>
  value?.type === 'VARIABLE_ALIAS' && typeof value.id === 'string';

const isRGB = (value: any): value is RGB | RGBA =>
  typeof value?.r === 'number' &&
  typeof value.g === 'number' &&
  typeof value.b === 'number';

const isBaseColor = (value: any): value is RGB | RGBA | VariableAlias =>
  isAlias(value) || isRGB(value);

const isOpacity = (value: any): value is number | VariableAlias =>
  isAlias(value) || typeof value === 'number';

export const isComposedColorObject = (
  value: any
): value is ComposedColorObject =>
  typeof value === 'object' &&
  value !== null &&
  isBaseColor(value.color) &&
  isOpacity(value.opacity);

export const isComposedColorExpression = (
  value: any
): value is ComposedColorExpression =>
  value?.type === 'VARIABLE_EXPRESSION' &&
  value.expressionFunction === 'COMPOSE_COLOR' &&
  Array.isArray(value.expressionArguments);

export const isComposedColor = (value: any): value is ComposedColorValue =>
  isComposedColorObject(value) || isComposedColorExpression(value);

/**
 * The typings describe expression arguments as `VariableData`
 * (`{ type, resolvedType, value }`) while Figma Desktop returns the bare
 * alias / number. Accept both by unwrapping the `value` when present.
 */
const unwrapArgument = (argument: any): any => {
  if (
    argument &&
    typeof argument === 'object' &&
    'value' in argument &&
    !isAlias(argument) &&
    !isRGB(argument)
  ) {
    return unwrapArgument(argument.value);
  }
  return argument;
};

export interface ComposedColorParts {
  baseColor: RGB | RGBA | VariableAlias;
  opacity: number | VariableAlias;
}

/**
 * Reads the base color and opacity out of either composed color shape,
 * throwing a descriptive error (with the raw value) when the shape is not
 * one the plugin knows how to handle, so the export can report it instead
 * of crashing somewhere down the line.
 */
export const getComposedColorParts = (value: any): ComposedColorParts => {
  if (isComposedColorObject(value)) {
    return { baseColor: value.color, opacity: value.opacity };
  }

  if (isComposedColorExpression(value)) {
    const [baseColor, opacity] = value.expressionArguments.map(unwrapArgument);
    if (isBaseColor(baseColor) && isOpacity(opacity)) {
      return { baseColor, opacity };
    }
  }

  throw new Error(`Unsupported composed color value: ${JSON.stringify(value)}`);
};

/** The shape current Figma runtimes store and accept in `setValueForMode`. */
export const toComposedColorObject = ({
  baseColor,
  opacity,
}: ComposedColorParts): ComposedColorObject => ({
  color: baseColor,
  opacity,
});

/** The shape earlier Figma runtimes (Desktop 126.x) exposed. */
export const toComposedColorExpression = ({
  baseColor,
  opacity,
}: ComposedColorParts): ComposedColorExpression => ({
  type: 'VARIABLE_EXPRESSION',
  expressionFunction: 'COMPOSE_COLOR',
  expressionArguments: [baseColor, opacity],
});

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
  const { baseColor, opacity } = getComposedColorParts(value);

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
