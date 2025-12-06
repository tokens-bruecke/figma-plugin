import { describe, expect, test } from 'vitest';
import { IResolver } from '../resolver';

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
        },
        resolver
      )
    ).toBe('0.4px');
  });
});
