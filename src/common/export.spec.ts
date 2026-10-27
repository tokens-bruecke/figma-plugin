import { describe, it, expect } from 'vitest';
import { getTokens } from './export';
import { splitTokensIntoFiles } from './transform/splitTokensIntoFiles';
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

  it('keep the paint opacity of a color style bound to a variable', async () => {
    const translucent: IResolver = {
      ...resolver,
      getLocalPaintStyles: async () =>
        [
          {
            id: 'S:1',
            name: 'brand',
            paints: [
              { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.5 },
            ],
            boundVariables: { paints: [alias] },
          },
        ] as unknown as PaintStyle[],
    };

    const tokens = await getTokens(translucent, config);
    const percent = await getTokens(translucent, {
      ...config,
      usePercentageOpacity: true,
    });

    expect(tokens['Color-styles'].brand.$value).toEqual({
      components: '{Core.color.brand}',
      alpha: 0.5,
    });
    expect(percent['Color-styles'].brand.$value.alpha).toBe('50%');
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

describe('variables named like a group', () => {
  const variable = (id: string, name: string, values: any) => ({
    id,
    name,
    variableCollectionId: 'c1',
    resolvedType: 'FLOAT',
    scopes: ['ALL_SCOPES'],
    valuesByMode: values,
  });
  const variables = [
    variable('v1', 'border/brand', { light: 1, dark: 2 }),
    variable('v2', 'border/brand/subtle', { light: 3, dark: 4 }),
    variable('v3', 'gap', {
      light: { type: 'VARIABLE_ALIAS', id: 'v1' },
      dark: { type: 'VARIABLE_ALIAS', id: 'v1' },
    }),
  ] as unknown as Variable[];
  const collection = {
    id: 'c1',
    name: 'Core',
    defaultModeId: 'light',
    modes: [
      { modeId: 'light', name: 'Light' },
      { modeId: 'dark', name: 'Dark' },
    ],
    variableIds: ['v1', 'v2', 'v3'],
  } as unknown as VariableCollection;
  const resolver: IResolver = {
    ...emptyResolver,
    getLocalVariableCollections: async () => [collection],
    getLocalVariables: async () => variables,
    getVariableById: async (id) => variables.find((v) => v.id === id),
    getVariableCollectionById: async () => collection,
  };
  const config = { ...defaultConfig, omitCreatedAt: true };

  it('exports the variable as the $root token of the group, with aliases to it', async () => {
    const tokens = await getTokens(resolver, config);

    expect(tokens.Core.border.brand.$root.$value).toEqual({
      value: 1,
      unit: 'px',
    });
    expect(tokens.Core.border.brand.subtle.$value).toEqual({
      value: 3,
      unit: 'px',
    });
    expect(tokens.Core.border.brand).not.toHaveProperty('$value');
    expect(tokens.Core.gap.$value).toBe('{Core.border.brand.$root}');
  });

  it('applies the mode to the $root token and its siblings with splitByMode', async () => {
    const tokens = await getTokens(resolver, { ...config, splitByMode: true });
    const dark = tokens['Core/Dark'];

    expect(dark.border.brand.$root.$value).toEqual({ value: 2, unit: 'px' });
    expect(dark.border.brand.subtle.$value).toEqual({ value: 4, unit: 'px' });
    expect(dark.border.brand.subtle).not.toHaveProperty('$extensions');
  });

  it('keeps the legacy merged shape without DTCG', async () => {
    const tokens = await getTokens(resolver, { ...config, useDTCG: false });

    expect(tokens.Core.border.brand.value).toBe('1px');
    expect(tokens.Core.border.brand.subtle.value).toBe('3px');
  });
});

describe('collection and mode names with a slash', () => {
  const collection = {
    id: 'c1',
    name: 'Brand/Core',
    defaultModeId: 'light',
    modes: [
      { modeId: 'light', name: 'Brand A/Light' },
      { modeId: 'dark', name: 'Brand A/Dark' },
    ],
    variableIds: ['v1', 'v2'],
  } as unknown as VariableCollection;
  const variables = [
    {
      id: 'v1',
      name: 'space/1',
      variableCollectionId: 'c1',
      resolvedType: 'FLOAT',
      scopes: ['ALL_SCOPES'],
      valuesByMode: { light: 4, dark: 8 },
    },
    {
      id: 'v2',
      name: 'gap',
      variableCollectionId: 'c1',
      resolvedType: 'FLOAT',
      scopes: ['ALL_SCOPES'],
      valuesByMode: {
        light: { type: 'VARIABLE_ALIAS', id: 'v1' },
        dark: { type: 'VARIABLE_ALIAS', id: 'v1' },
      },
    },
  ] as unknown as Variable[];
  const resolver: IResolver = {
    ...emptyResolver,
    getLocalVariableCollections: async () => [collection],
    getLocalVariables: async () => variables,
    getVariableById: async (id) => variables.find((v) => v.id === id),
    getVariableCollectionById: async () => collection,
  };
  const config = { ...defaultConfig, omitCreatedAt: true };

  it('keeps them as single names', async () => {
    const tokens = await getTokens(resolver, config);
    const core = tokens['Brand/Core'];

    expect(Object.keys(tokens)).toEqual(['Brand/Core', '$extensions']);
    expect(core.gap.$value).toBe('{Brand/Core.space.1}');
    expect(core.space['1'].$extensions.mode).toEqual({
      'Brand A/Light': { value: 4, unit: 'px' },
      'Brand A/Dark': { value: 8, unit: 'px' },
    });
  });

  it('writes one file per mode under the collection folder', async () => {
    const tokens = await getTokens(resolver, { ...config, splitByMode: true });
    const files = splitTokensIntoFiles(tokens, { splitByMode: true }, 'out');

    expect(files.map((file) => file.path)).toEqual([
      'out/Brand-Core/Brand A-Light.tokens.json',
      'out/Brand-Core/Brand A-Dark.tokens.json',
    ]);
    const dark = JSON.parse(files[1].content);
    expect(dark['Brand/Core'].space['1'].$value).toEqual({
      value: 8,
      unit: 'px',
    });
  });

  it('keeps a single-mode collection with a slash in one file', async () => {
    const singleMode = {
      ...collection,
      modes: [{ modeId: 'light', name: 'Value' }],
    } as unknown as VariableCollection;
    const tokens = await getTokens(
      {
        ...resolver,
        getLocalVariableCollections: async () => [singleMode],
        getVariableCollectionById: async () => singleMode,
      },
      { ...config, splitByMode: true }
    );
    const files = splitTokensIntoFiles(tokens, { splitByMode: true }, 'out');

    expect(files.map((file) => file.path)).toEqual([
      'out/Brand-Core.tokens.json',
    ]);
    expect(Object.keys(JSON.parse(files[0].content))).toEqual(['Brand/Core']);
  });
});

describe('collection names with a dot', () => {
  const collection = {
    id: 'c1',
    name: '1. Primitives',
    defaultModeId: 'm1',
    modes: [{ modeId: 'm1', name: 'Value' }],
    variableIds: ['v1', 'v2'],
  } as unknown as VariableCollection;
  const variables = [
    {
      id: 'v1',
      name: 'blue',
      variableCollectionId: 'c1',
      resolvedType: 'COLOR',
      scopes: ['ALL_SCOPES'],
      valuesByMode: { m1: { r: 0, g: 0, b: 1, a: 1 } },
    },
    {
      id: 'v2',
      name: 'link',
      variableCollectionId: 'c1',
      resolvedType: 'COLOR',
      scopes: ['ALL_SCOPES'],
      valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'v1' } },
    },
  ] as unknown as Variable[];

  it('uses a DTCG-safe group name and keeps the Figma name in the meta', async () => {
    const warnings: string[] = [];
    const tokens = await getTokens(
      {
        ...emptyResolver,
        getLocalVariableCollections: async () => [collection],
        getLocalVariables: async () => variables,
        getVariableById: async (id) => variables.find((v) => v.id === id),
        getVariableCollectionById: async () => collection,
        warn: (message) => warnings.push(message),
      },
      { ...defaultConfig, omitCreatedAt: true }
    );

    expect(Object.keys(tokens)).toEqual(['1- Primitives', '$extensions']);
    expect(tokens['1- Primitives'].link.$value).toBe('{1- Primitives.blue}');
    expect(metaOf(tokens).variableCollections).toEqual(['1. Primitives']);
    expect(warnings).toEqual([
      expect.stringContaining('"1. Primitives" is exported as "1- Primitives"'),
    ]);
  });
});
