import { describe, expect, test } from 'vitest';

import { normalizeType, isNonSpecTokenType } from './normalizeType';

describe('getFontStyleAndWeight', () => {
  test('String font weight', async () => {
    expect(normalizeType('STRING', ['FONT_WEIGHT'])).toBe('fontWeight');
  });
  test('Numeric font weight', async () => {
    expect(normalizeType('FLOAT', ['FONT_WEIGHT'])).toBe('fontWeight');
  });
});

describe('isNonSpecTokenType', () => {
  test('string and boolean are not valid DTCG types', () => {
    expect(isNonSpecTokenType(normalizeType('STRING', []))).toBe(true);
    expect(isNonSpecTokenType(normalizeType('BOOLEAN', []))).toBe(true);
  });
  test('color, dimension and fontWeight are valid DTCG types', () => {
    expect(isNonSpecTokenType(normalizeType('COLOR', []))).toBe(false);
    expect(isNonSpecTokenType(normalizeType('FLOAT', []))).toBe(false);
    expect(isNonSpecTokenType(normalizeType('FLOAT', ['FONT_WEIGHT']))).toBe(
      false
    );
  });
});
