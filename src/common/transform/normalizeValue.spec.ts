import { describe, expect, test } from 'vitest';
import { IResolver } from '@common/resolver';

import { normalizeValue } from './normalizeValue';

const resolver = {} as IResolver;

describe('getFontStyleAndWeight', () => {
  test('Lossy float', async () => {
    expect(
      await normalizeValue(
        {
          variableValue: 0.40000000200345043,
          variableType: 'FLOAT',
          variableScope: [],
          colorMode: 'hex',
          useDTCGKeys: false,
          includeValueStringKeyToAlias: false,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toBe('0.4px');
  });

  test('Numeric font weight', async () => {
    expect(
      await normalizeValue(
        {
          variableValue: 600,
          variableType: 'FLOAT',
          variableScope: ['FONT_WEIGHT'],
          colorMode: 'hex',
          useDTCGKeys: true,
          includeValueStringKeyToAlias: true,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toBe(600);
  });
});
