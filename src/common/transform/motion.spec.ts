import { describe, expect, test } from 'vitest';

import {
  EASING_PRESET_BEZIERS,
  makeDuration,
  normalizeEasing,
  parseDurationToSeconds,
  parseEasing,
} from './motion';
import { normalizeType } from './normalizeType';

describe('makeDuration', () => {
  test('converts seconds to milliseconds as a DTCG object', () => {
    expect(makeDuration(0.3, true)).toEqual({ value: 300, unit: 'ms' });
  });

  test('converts seconds to a millisecond string in native format', () => {
    expect(makeDuration(0.3, false)).toBe('300ms');
  });

  test('strips float32 noise coming from Figma', () => {
    expect(makeDuration(0.30000001192092896, true)).toEqual({
      value: 300,
      unit: 'ms',
    });
  });

  test('keeps sub-millisecond precision', () => {
    expect(makeDuration(0.0166667, true)).toEqual({
      value: 16.667,
      unit: 'ms',
    });
  });
});

describe('normalizeEasing', () => {
  test('exports a custom bezier as a cubicBezier array', () => {
    expect(
      normalizeEasing(
        {
          type: 'CUSTOM_CUBIC_BEZIER',
          easingFunctionCubicBezier: {
            x1: 0,
            y1: 0,
            x2: 0.5799999833106995,
            y2: 1,
          },
        },
        true
      )
    ).toEqual({ type: 'cubicBezier', value: [0, 0, 0.58, 1] });
  });

  test('expands a named preset when the setting is on', () => {
    expect(normalizeEasing({ type: 'EASE_IN' }, true)).toEqual({
      type: 'cubicBezier',
      value: EASING_PRESET_BEZIERS.EASE_IN,
    });
  });

  test('keeps a named preset as a string when the setting is off', () => {
    expect(normalizeEasing({ type: 'EASE_IN' }, false)).toEqual({
      type: 'string',
      value: 'ease-in',
    });
  });

  test('always exports spring presets as names', () => {
    expect(normalizeEasing({ type: 'GENTLE' }, true)).toEqual({
      type: 'string',
      value: 'gentle',
    });
    expect(normalizeEasing({ type: 'HOLD' }, true)).toEqual({
      type: 'string',
      value: 'hold',
    });
  });

  test('carries the bounce value of a custom spring', () => {
    expect(
      normalizeEasing(
        { type: 'CUSTOM_SPRING', easingFunctionSpring: { bounce: 0.35 } },
        true
      )
    ).toEqual({ type: 'string', value: 'spring(bounce 0.35)' });
  });
});

describe('normalizeType', () => {
  test('TIMING resolves to duration', () => {
    expect(normalizeType('TIMING', [])).toBe('duration');
  });

  test('EASING resolves by the preset it holds', () => {
    expect(normalizeType('EASING', [], false, { type: 'EASE_IN' }, true)).toBe(
      'cubicBezier'
    );
    expect(normalizeType('EASING', [], false, { type: 'EASE_IN' }, false)).toBe(
      'string'
    );
    expect(normalizeType('EASING', [], false, { type: 'BOUNCY' }, true)).toBe(
      'string'
    );
  });
});

describe('parseDurationToSeconds', () => {
  test('reads DTCG duration objects', () => {
    expect(parseDurationToSeconds({ value: 300, unit: 'ms' })).toBe(0.3);
    expect(parseDurationToSeconds({ value: 0.3, unit: 's' })).toBe(0.3);
  });

  test('reads duration strings and bare numbers', () => {
    expect(parseDurationToSeconds('300ms')).toBe(0.3);
    expect(parseDurationToSeconds('0.3s')).toBe(0.3);
    expect(parseDurationToSeconds(300)).toBe(0.3);
  });

  test('throws on unparseable values', () => {
    expect(() => parseDurationToSeconds('quickly')).toThrow();
  });
});

describe('parseEasing', () => {
  test('reads a custom bezier array', () => {
    expect(parseEasing([0.1, 0.2, 0.3, 0.4])).toEqual({
      type: 'CUSTOM_CUBIC_BEZIER',
      easingFunctionCubicBezier: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
    });
  });

  test('matches an expanded preset back to the preset', () => {
    expect(parseEasing(EASING_PRESET_BEZIERS.EASE_IN)).toEqual({
      type: 'EASE_IN',
    });
  });

  test('reads preset names', () => {
    expect(parseEasing('ease-in-and-out')).toEqual({
      type: 'EASE_IN_AND_OUT',
    });
    expect(parseEasing('bouncy')).toEqual({ type: 'BOUNCY' });
    expect(parseEasing('hold')).toEqual({ type: 'HOLD' });
  });

  test('reads a custom spring', () => {
    expect(parseEasing('spring(bounce 0.35)')).toEqual({
      type: 'CUSTOM_SPRING',
      easingFunctionSpring: { bounce: 0.35 },
    });
  });

  test('throws on unparseable values', () => {
    expect(() => parseEasing('wobbly')).toThrow();
  });
});

describe('round trip', () => {
  test('a custom bezier survives export and import', () => {
    const exported = normalizeEasing(
      {
        type: 'CUSTOM_CUBIC_BEZIER',
        easingFunctionCubicBezier: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
      },
      true
    );
    expect(parseEasing(exported.value)).toEqual({
      type: 'CUSTOM_CUBIC_BEZIER',
      easingFunctionCubicBezier: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
    });
  });

  test.each([
    'LINEAR',
    'EASE_IN',
    'EASE_OUT',
    'EASE_IN_AND_OUT',
    'EASE_IN_BACK',
    'EASE_OUT_BACK',
    'EASE_IN_AND_OUT_BACK',
    'GENTLE',
    'QUICK',
    'BOUNCY',
    'SLOW',
    'HOLD',
  ] as const)('preset %s survives export and import', (type) => {
    for (const expandEasingPresets of [true, false]) {
      const exported = normalizeEasing({ type }, expandEasingPresets);
      expect(parseEasing(exported.value)).toEqual({ type });
    }
  });

  test('a duration survives export and import', () => {
    const exported = makeDuration(0.30000001192092896, true);
    expect(parseDurationToSeconds(exported)).toBe(0.3);
  });
});
