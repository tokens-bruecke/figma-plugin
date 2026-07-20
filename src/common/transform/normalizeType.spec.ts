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
