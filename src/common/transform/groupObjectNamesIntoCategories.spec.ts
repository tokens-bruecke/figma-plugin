import { describe, expect, test } from 'vitest';

import { groupObjectNamesIntoCategories } from './groupObjectNamesIntoCategories';

describe('groupObjectNamesIntoCategories', () => {
  test('groups slash-separated names into nested categories', () => {
    const result = groupObjectNamesIntoCategories({
      'spacing/sm': { $value: 4 },
      'spacing/md': { $value: 8 },
    });

    expect(result).toStrictEqual({
      spacing: {
        sm: { $value: 4 },
        md: { $value: 8 },
      },
    });
  });

  test('keeps siblings when a variable is named like their group (parent first)', () => {
    const result = groupObjectNamesIntoCategories({
      'bg/brand': { $value: '#f00' },
      'bg/brand/subtle': { $value: '#f88' },
    });

    expect(result['bg']['brand']['$value']).toBe('#f00');
    expect(result['bg']['brand']['subtle']).toStrictEqual({ $value: '#f88' });
  });

  test('keeps siblings when a variable is named like their group (children first)', () => {
    // Regression test for #83: with children ordered before the
    // same-named variable, the variable used to overwrite the whole
    // group and its children were silently dropped.
    const result = groupObjectNamesIntoCategories({
      'border/brand/subtle': { $value: '#f88' },
      'border/brand/strong': { $value: '#800' },
      'border/brand': { $value: '#f00' },
      'border/brand/xsubtle': { $value: '#fcc' },
    });

    expect(result['border']['brand']['$value']).toBe('#f00');
    expect(result['border']['brand']['subtle']).toStrictEqual({
      $value: '#f88',
    });
    expect(result['border']['brand']['strong']).toStrictEqual({
      $value: '#800',
    });
    expect(result['border']['brand']['xsubtle']).toStrictEqual({
      $value: '#fcc',
    });
  });
});
