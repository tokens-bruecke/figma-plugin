import Decimal from 'decimal.js';

export interface DurationValueI {
  value: number;
  unit: 'ms';
}

export type CubicBezierValueI = [number, number, number, number];

type MotionEasingType = MotionEasing['type'];

/**
 * Cubic-bezier equivalents of Figma's named easing presets, as returned by
 * the Plugin API (`easingFunctionCubicBezier` on a preset value, verified
 * September 2026). Used when a preset arrives without its curve attached, and
 * to map an expanded curve back to its preset on import.
 */
export const EASING_PRESET_BEZIERS: Partial<
  Record<MotionEasingType, CubicBezierValueI>
> = {
  LINEAR: [0, 0, 1, 1],
  EASE_IN: [0.42, 0, 1, 1],
  EASE_OUT: [0, 0, 0.58, 1],
  EASE_IN_AND_OUT: [0.42, 0, 0.58, 1],
  EASE_IN_BACK: [0.3, -0.05, 0.7, -0.5],
  EASE_OUT_BACK: [0.45, 1.45, 0.8, 1],
  EASE_IN_AND_OUT_BACK: [0.7, -0.4, 0.4, 1.4],
};

/**
 * Readable names used when a preset is not expanded into a curve. Springs and
 * `HOLD` always fall back to these — Figma exposes no numbers to expand them
 * into, so the name is all there is to export.
 */
export const EASING_PRESET_NAMES: Record<MotionEasingType, string> = {
  LINEAR: 'linear',
  EASE_IN: 'ease-in',
  EASE_OUT: 'ease-out',
  EASE_IN_AND_OUT: 'ease-in-and-out',
  EASE_IN_BACK: 'ease-in-back',
  EASE_OUT_BACK: 'ease-out-back',
  EASE_IN_AND_OUT_BACK: 'ease-in-and-out-back',
  GENTLE: 'gentle',
  QUICK: 'quick',
  BOUNCY: 'bouncy',
  SLOW: 'slow',
  HOLD: 'hold',
  CUSTOM_CUBIC_BEZIER: 'custom-bezier',
  CUSTOM_SPRING: 'custom-spring',
};

/** Matches the `spring(bounce 0.35)` form produced by `normalizeEasing`. */
const CUSTOM_SPRING_PATTERN = /^spring\(\s*bounce\s+(-?\d*\.?\d+)\s*\)$/i;

// Figma stores motion values as 32-bit floats, so a 0.3s duration comes back
// as 0.30000001192092896. Rounding at these precisions removes the noise
// without touching any value a designer could have entered.
const DURATION_DECIMALS = 3;
const BEZIER_DECIMALS = 6;
// How far a control point may drift from the table when matching an exported
// curve back to a preset (float noise, older exports of a preset).
const BEZIER_TOLERANCE = 0.02;

const round = (value: number, decimals: number): number =>
  new Decimal(value).toDecimalPlaces(decimals).toNumber();

const isMotionEasing = (value: any): value is MotionEasing =>
  typeof value === 'object' && value !== null && typeof value.type === 'string';

/**
 * Formats a Figma TIMING value (seconds) as a duration token.
 * - DTCG 2025.10: `{ value: 300, unit: "ms" }`
 * - Native (legacy): `"300ms"`
 */
export const makeDuration = (
  seconds: number,
  useDTCG: boolean
): DurationValueI | string => {
  const milliseconds = round(Number(seconds) * 1000, DURATION_DECIMALS);

  if (useDTCG) {
    return { value: milliseconds, unit: 'ms' };
  }

  return `${milliseconds}ms`;
};

/**
 * Converts a Figma EASING value into a token type and value.
 *
 * Custom beziers always export as a `cubicBezier` array. Named bezier presets
 * do too when `expandEasingPresets` is on, using {@link EASING_PRESET_BEZIERS};
 * otherwise they keep their Figma name as a string. Springs and `HOLD` are
 * always strings — DTCG has no spring type, and Figma gives no curve to
 * approximate one with.
 */
export const normalizeEasing = (
  easing: any,
  expandEasingPresets: boolean
): { type: 'cubicBezier' | 'string'; value: CubicBezierValueI | string } => {
  if (!isMotionEasing(easing)) {
    return { type: 'string', value: String(easing) };
  }

  const toCurve = (bezier: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }): CubicBezierValueI =>
    [bezier.x1, bezier.y1, bezier.x2, bezier.y2].map((point) =>
      round(point, BEZIER_DECIMALS)
    ) as CubicBezierValueI;

  if (
    easing.type === 'CUSTOM_CUBIC_BEZIER' &&
    easing.easingFunctionCubicBezier
  ) {
    return {
      type: 'cubicBezier',
      value: toCurve(easing.easingFunctionCubicBezier),
    };
  }

  if (easing.type === 'CUSTOM_SPRING') {
    const bounce = easing.easingFunctionSpring?.bounce;
    return {
      type: 'string',
      value:
        typeof bounce === 'number'
          ? `spring(bounce ${round(bounce, BEZIER_DECIMALS)})`
          : EASING_PRESET_NAMES.CUSTOM_SPRING,
    };
  }

  const presetBezier = EASING_PRESET_BEZIERS[easing.type];
  if (expandEasingPresets && presetBezier) {
    // Prefer the curve Figma attaches to the preset over the table
    return {
      type: 'cubicBezier',
      value: easing.easingFunctionCubicBezier
        ? toCurve(easing.easingFunctionCubicBezier)
        : presetBezier,
    };
  }

  return {
    type: 'string',
    value: EASING_PRESET_NAMES[easing.type] ?? String(easing.type),
  };
};

/**
 * Parses a duration token value back into the seconds Figma stores.
 * Accepts `{ value: 300, unit: "ms" }`, `"300ms"`, `"0.3s"` and bare numbers
 * (treated as milliseconds, matching this plugin's own export).
 */
export const parseDurationToSeconds = (value: any): number => {
  if (typeof value === 'object' && value !== null) {
    const amount = Number(value.value);
    if (Number.isNaN(amount)) {
      throw new Error(`Unsupported duration value: ${JSON.stringify(value)}`);
    }
    return value.unit === 's' ? amount : amount / 1000;
  }

  if (typeof value === 'string') {
    const match = value.trim().match(/^(-?\d*\.?\d+)\s*(ms|s)?$/i);
    if (!match) {
      throw new Error(`Unsupported duration value: ${value}`);
    }
    const amount = Number(match[1]);
    return match[2]?.toLowerCase() === 's' ? amount : amount / 1000;
  }

  const amount = Number(value);
  if (Number.isNaN(amount)) {
    throw new Error(`Unsupported duration value: ${JSON.stringify(value)}`);
  }
  return amount / 1000;
};

/**
 * Parses an easing token value back into a Figma `MotionEasing`.
 *
 * Understands the three shapes this plugin exports — a `cubicBezier` array, a
 * preset name (`"ease-in"`, `"gentle"`, `"hold"`) and `"spring(bounce 0.35)"`.
 * Curve arrays are matched against {@link EASING_PRESET_BEZIERS} first so an
 * expanded preset round-trips back to the preset rather than a custom bezier.
 */
export const parseEasing = (value: any): MotionEasing => {
  if (Array.isArray(value) && value.length === 4) {
    const [x1, y1, x2, y2] = value.map(Number);
    if ([x1, y1, x2, y2].some(Number.isNaN)) {
      throw new Error(`Unsupported easing value: ${JSON.stringify(value)}`);
    }

    const preset = (
      Object.keys(EASING_PRESET_BEZIERS) as MotionEasingType[]
    ).find((type) =>
      EASING_PRESET_BEZIERS[type].every(
        (point, index) => Math.abs(point - value[index]) <= BEZIER_TOLERANCE
      )
    );
    if (preset) {
      return { type: preset };
    }

    return {
      type: 'CUSTOM_CUBIC_BEZIER',
      easingFunctionCubicBezier: { x1, y1, x2, y2 },
    };
  }

  if (typeof value === 'string') {
    const springMatch = value.trim().match(CUSTOM_SPRING_PATTERN);
    if (springMatch) {
      return {
        type: 'CUSTOM_SPRING',
        easingFunctionSpring: { bounce: Number(springMatch[1]) },
      };
    }

    const normalizedName = value.trim().toLowerCase();
    const preset = (
      Object.keys(EASING_PRESET_NAMES) as MotionEasingType[]
    ).find((type) => EASING_PRESET_NAMES[type] === normalizedName);
    if (preset) {
      return { type: preset };
    }
  }

  if (isMotionEasing(value)) {
    // Already a Figma easing object (e.g. re-importing an untouched export)
    return value;
  }

  throw new Error(`Unsupported easing value: ${JSON.stringify(value)}`);
};
