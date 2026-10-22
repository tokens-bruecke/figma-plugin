import { describe, it, expect } from 'vitest';
import { getTokens } from './export';
import { defaultConfig } from '@cli/defaults';
import type { IResolver } from './resolver';

const emptyResolver: IResolver = {
  getLocalEffectStyles: async () => [],
  getLocalVariableCollections: async () => [],
  getLocalVariables: async () => [],
  getLocalGridStyles: async () => [],
  getLocalTextStyles: async () => [],
  getLocalPaintStyles: async () => [],
  getVariableById: async () => null,
  getVariableCollectionById: async () => null,
};

const metaOf = (tokens: any) => tokens.$extensions['tokens-bruecke-meta'];

describe('getTokens metadata', () => {
  it('includes createdAt by default', async () => {
    const tokens = await getTokens(emptyResolver, defaultConfig);

    expect(metaOf(tokens).createdAt).toEqual(expect.any(String));
  });

  it('leaves createdAt out with omitCreatedAt, so the output does not change between runs', async () => {
    const config = { ...defaultConfig, omitCreatedAt: true };
    const first = await getTokens(emptyResolver, config);
    const second = await getTokens(emptyResolver, config);

    expect(metaOf(first)).not.toHaveProperty('createdAt');
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe('getTokens styles', () => {
  const resolver: IResolver = {
    ...emptyResolver,
    getLocalVariableCollections: async () =>
      [
        {
          id: 'c1',
          name: 'Core',
          defaultModeId: 'm1',
          modes: [{ modeId: 'm1', name: 'Value' }],
          variableIds: ['v1'],
        },
      ] as unknown as VariableCollection[],
    getLocalVariables: async () =>
      [
        {
          id: 'v1',
          name: 'color/brand',
          variableCollectionId: 'c1',
          resolvedType: 'COLOR',
          scopes: ['ALL_SCOPES'],
          valuesByMode: { m1: { r: 0, g: 0, b: 0, a: 1 } },
        },
      ] as unknown as Variable[],
    getLocalPaintStyles: async () =>
      [
        {
          id: 'S:1',
          name: 'red',
          paints: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
        },
      ] as unknown as PaintStyle[],
  };

  const config = {
    ...defaultConfig,
    omitCreatedAt: true,
    includedStyles: {
      ...defaultConfig.includedStyles,
      colors: { isIncluded: true, customName: 'Color-styles' },
    },
  };

  it('adds the styles to the chosen collection', async () => {
    const tokens = await getTokens(resolver, {
      ...config,
      storeStyleInCollection: 'Core',
    });

    expect(tokens.Core['Color-styles'].red.$value).toBe('#ff0000');
  });

  it('keeps the styles separate when collection names are omitted', async () => {
    const tokens = await getTokens(resolver, {
      ...config,
      storeStyleInCollection: 'Core',
      omitCollectionNames: true,
    });

    expect(tokens['Color-styles'].red.$value).toBe('#ff0000');
    expect(tokens.color.brand.$value).toBe('#000000');
  });
});

describe('style aliases', () => {
  const alias = { type: 'VARIABLE_ALIAS', id: 'v1' };
  const collections = [
    {
      id: 'c1',
      name: 'Core',
      defaultModeId: 'm1',
      modes: [{ modeId: 'm1', name: 'Value' }],
      variableIds: ['v1'],
    },
  ] as unknown as VariableCollection[];
  const variables = [
    {
      id: 'v1',
      name: 'color/brand',
      variableCollectionId: 'c1',
      resolvedType: 'COLOR',
      scopes: ['ALL_SCOPES'],
      valuesByMode: { m1: { r: 0, g: 0, b: 0, a: 1 } },
    },
  ] as unknown as Variable[];

  const resolver: IResolver = {
    ...emptyResolver,
    getLocalVariableCollections: async () => collections,
    getLocalVariables: async () => variables,
    getVariableById: async (id) => variables.find((v) => v.id === id) ?? null,
    getVariableCollectionById: async (id) =>
      collections.find((c) => c.id === id) ?? null,
    getLocalPaintStyles: async () =>
      [
        {
          id: 'S:1',
          name: 'brand',
          paints: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }],
          boundVariables: { paints: [alias] },
        },
      ] as unknown as PaintStyle[],
    getLocalEffectStyles: async () =>
      [
        {
          id: 'S:2',
          name: 'shadow',
          effects: [
            {
              type: 'DROP_SHADOW',
              color: { r: 0, g: 0, b: 0, a: 1 },
              offset: { x: 0, y: 1 },
              radius: 2,
              spread: 0,
              boundVariables: { color: alias },
            },
          ],
        },
      ] as unknown as EffectStyle[],
  };

  const config = {
    ...defaultConfig,
    omitCreatedAt: true,
    includedStyles: {
      ...defaultConfig.includedStyles,
      colors: { isIncluded: true, customName: 'Color-styles' },
      effects: { isIncluded: true, customName: 'Effect-styles' },
    },
  };

  it('include the collection name by default', async () => {
    const tokens = await getTokens(resolver, config);

    expect(tokens['Color-styles'].brand.$value).toBe('{Core.color.brand}');
    expect(tokens['Effect-styles'].shadow.$value[0].color).toBe(
      '{Core.color.brand}'
    );
  });

  it('leave the collection name out with omitCollectionNames, like variable aliases', async () => {
    const tokens = await getTokens(resolver, {
      ...config,
      omitCollectionNames: true,
    });

    expect(tokens['Color-styles'].brand.$value).toBe('{color.brand}');
    expect(tokens['Effect-styles'].shadow.$value[0].color).toBe(
      '{color.brand}'
    );
  });
});
