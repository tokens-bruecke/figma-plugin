import { describe, expect, test } from 'vitest';

import { normalizeType } from './normalizeType';

describe('getFontStyleAndWeight', () => {
  test('String font weight', async () => {
    expect(normalizeType('STRING', ['FONT_WEIGHT'])).toBe('fontWeight');
  });
  test('Numeric font weight', async () => {
    expect(normalizeType('FLOAT', ['FONT_WEIGHT'])).toBe('fontWeight');
  });
});

describe('opacity scopes', () => {
  test('OPACITY', () => {
    expect(normalizeType('FLOAT', ['OPACITY'])).toBe('number');
    expect(normalizeType('FLOAT', ['OPACITY'], true)).toBe('string');
  });
  test('COLOR_OPACITY (opacity of a color variable)', () => {
    expect(normalizeType('FLOAT', ['COLOR_OPACITY' as VariableScope])).toBe(
      'number'
    );
    expect(
      normalizeType(
        'FLOAT',
        ['OPACITY', 'COLOR_OPACITY' as VariableScope],
        true
      )
    ).toBe('string');
  });
  test('mixed with other scopes stays a dimension', () => {
    expect(normalizeType('FLOAT', ['OPACITY', 'GAP'])).toBe('dimension');
  });
});
