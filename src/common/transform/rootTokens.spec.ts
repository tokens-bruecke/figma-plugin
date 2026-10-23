import { describe, expect, test } from 'vitest';

import { addRootToReferences } from './rootTokens';

const tree = () => ({
  Core: {
    border: {
      brand: {
        $root: { $type: 'color', $value: '#f00' },
        subtle: { $type: 'color', $value: '#f88' },
      },
    },
    plain: { $type: 'color', $value: '{Core.border.brand}' },
    withValueKey: { $type: 'color', $value: '{Core.border.brand.$value}' },
    child: { $type: 'color', $value: '{Core.border.brand.subtle}' },
    unknown: { $type: 'color', $value: '{Other.border.brand}' },
    composed: {
      $type: 'color',
      $value: { components: '{Core.border.brand}', alpha: 0.5 },
      $extensions: {
        mode: { Light: '{Core.border.brand}', Dark: '#000' },
      },
    },
  },
});

describe('addRootToReferences', () => {
  test('points references to a group with a root token at $root', () => {
    const tokens = tree();
    addRootToReferences(tokens);

    expect(tokens.Core.plain.$value).toBe('{Core.border.brand.$root}');
    expect(tokens.Core.withValueKey.$value).toBe(
      '{Core.border.brand.$root.$value}'
    );
    expect(tokens.Core.composed.$value.components).toBe(
      '{Core.border.brand.$root}'
    );
    expect(tokens.Core.composed.$extensions.mode).toEqual({
      Light: '{Core.border.brand.$root}',
      Dark: '#000',
    });
  });

  test('leaves other references alone', () => {
    const tokens = tree();
    addRootToReferences(tokens);

    expect(tokens.Core.child.$value).toBe('{Core.border.brand.subtle}');
    expect(tokens.Core.unknown.$value).toBe('{Other.border.brand}');
  });
});
