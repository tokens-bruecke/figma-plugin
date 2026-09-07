import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FileResolver, parseSnapshot } from './fileResolver';
import { getTokens } from '@common/export';

const exampleSnapshot = () =>
  parseSnapshot(
    readFileSync(
      join(__dirname, '../../examples/tokens-snapshot.json'),
      'utf-8'
    ),
    'example'
  );

const minimal = {
  variableCollections: [
    {
      id: 'C:1',
      name: 'Primitives',
      defaultModeId: 'm1',
      modes: [{ modeId: 'm1', name: 'Value' }],
      variableIds: ['V:1'],
    },
  ],
  variables: [
    {
      id: 'V:1',
      name: 'colors/primary',
      variableCollectionId: 'C:1',
      resolvedType: 'COLOR',
      valuesByMode: { m1: { r: 1, g: 0, b: 0, a: 1 } },
    },
  ],
};

const baseConfig: ExportSettingsI = {
  includedStyles: {
    text: { isIncluded: false, customName: 'Typography-styles' },
    effects: { isIncluded: false, customName: 'Effect-styles' },
    grids: { isIncluded: false, customName: 'Grid-styles' },
    colors: { isIncluded: false, customName: 'Color-styles' },
  },
  storeStyleInCollection: 'none',
  colorMode: 'hex',
  includeScopes: false,
  includeValueStringKeyToAlias: false,
  includeFigmaMetaData: false,
  useDTCG: true,
  usePercentageOpacity: false,
  expandEasingPresets: true,
  splitByCollection: false,
  splitByMode: false,
  omitCollectionNames: false,
};

describe('parseSnapshot', () => {
  it('accepts a snapshot with only variables and collections', () => {
    const snapshot = parseSnapshot(JSON.stringify(minimal), 'test');
    expect(snapshot.variables).toHaveLength(1);
    expect(snapshot.paintStyles).toBeUndefined();
  });

  it('rejects invalid JSON with the source name', () => {
    expect(() => parseSnapshot('{nope', 'stdin')).toThrow(
      /stdin is not valid JSON/
    );
  });

  it('rejects a non-object payload', () => {
    expect(() => parseSnapshot('[]', 'test')).toThrow(/must be a JSON object/);
  });

  it('names the missing top-level array', () => {
    expect(() =>
      parseSnapshot(JSON.stringify({ variables: [] }), 'test')
    ).toThrow(/missing the required "variableCollections" array/);
  });

  it('rejects a non-array style key', () => {
    expect(() =>
      parseSnapshot(JSON.stringify({ ...minimal, paintStyles: {} }), 'test')
    ).toThrow(/"paintStyles" must be an array/);
  });

  it('names the offending collection index', () => {
    const broken = {
      ...minimal,
      variableCollections: [{ id: 'C:1', name: 'Primitives' }],
    };
    expect(() => parseSnapshot(JSON.stringify(broken), 'test')).toThrow(
      /variableCollections\[0\] \("Primitives"\) is missing a "modes" array/
    );
  });

  it('names the offending variable index and key', () => {
    const broken = {
      ...minimal,
      variables: [{ ...minimal.variables[0], variableCollectionId: undefined }],
    };
    expect(() => parseSnapshot(JSON.stringify(broken), 'test')).toThrow(
      /variables\[0\] is missing a string "variableCollectionId"/
    );
  });

  it('requires valuesByMode to be an object', () => {
    const broken = {
      ...minimal,
      variables: [{ ...minimal.variables[0], valuesByMode: [] }],
    };
    expect(() => parseSnapshot(JSON.stringify(broken), 'test')).toThrow(
      /variables\[0\] \("colors\/primary"\) is missing a "valuesByMode" object/
    );
  });
});

describe('FileResolver', () => {
  it('returns empty arrays for styles absent from the snapshot', async () => {
    const resolver = new FileResolver(
      parseSnapshot(JSON.stringify(minimal), 'test')
    );
    expect(await resolver.getLocalPaintStyles()).toEqual([]);
    expect(await resolver.getLocalTextStyles()).toEqual([]);
    expect(await resolver.getLocalEffectStyles()).toEqual([]);
    expect(await resolver.getLocalGridStyles()).toEqual([]);
  });

  it('looks up variables and collections by id', async () => {
    const resolver = new FileResolver(exampleSnapshot());
    expect((await resolver.getVariableById('VariableID:1:2'))?.name).toBe(
      'colors/blue/500'
    );
    expect(
      (await resolver.getVariableCollectionById('VariableCollectionId:2:1'))
        ?.name
    ).toBe('Semantic');
    expect(await resolver.getVariableById('VariableID:missing')).toBeNull();
  });
});

describe('getTokens with a snapshot', () => {
  it('transforms variables, aliases and modes', async () => {
    const resolver = new FileResolver(exampleSnapshot());
    const tokens: any = await getTokens(resolver, baseConfig);

    expect(tokens.Primitives.colors.blue['500'].$value).toBe('#3366ff');
    expect(tokens.Primitives.colors.blue['500'].$type).toBe('color');
    expect(tokens.Primitives.spacing.md.$value).toEqual({
      value: 16,
      unit: 'px',
    });

    // Aliases resolve through the snapshot, across collections
    expect(tokens.Semantic.surface.accent.$value).toBe(
      '{Primitives.colors.blue.500}'
    );
    expect(tokens.Semantic.surface.accent.$extensions.mode.Dark).toBe(
      '#6699ff'
    );
  });

  it('exports color aliases with opacity as composed values', async () => {
    const resolver = new FileResolver(exampleSnapshot());
    const tokens: any = await getTokens(resolver, baseConfig);
    const muted = tokens.Semantic.surface['accent-muted'];

    expect(muted.$type).toBe('color');
    expect(muted.$value).toEqual({
      components: '{Primitives.colors.blue.500}',
      alpha: 0.5,
    });
    expect(muted.$extensions.mode.Dark).toEqual({
      components: '{Primitives.colors.blue.500}',
      alpha: '{Primitives.opacity.50}',
    });

    // The number variable driving the opacity exports like an OPACITY float
    expect(tokens.Primitives.opacity['50'].$type).toBe('number');
    expect(tokens.Primitives.opacity['50'].$value).toBe(0.5);
  });

  it('matches REST behaviour for aliases outside the snapshot', async () => {
    const orphan = {
      ...minimal,
      variables: [
        {
          ...minimal.variables[0],
          valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'V:library' } },
        },
      ],
    };
    const resolver = new FileResolver(
      parseSnapshot(JSON.stringify(orphan), 'test')
    );
    const tokens: any = await getTokens(resolver, baseConfig);

    expect(tokens.Primitives.colors.primary.$value).toBe('#missing#');
  });

  it('exports a variable-bound color style as an alias', async () => {
    const resolver = new FileResolver(exampleSnapshot());
    const tokens: any = await getTokens(resolver, {
      ...baseConfig,
      includedStyles: {
        ...baseConfig.includedStyles,
        colors: { isIncluded: true, customName: 'Color-styles' },
      },
    });

    expect(tokens['Color-styles'].Brand.Primary.$value).toBe(
      '{Primitives.colors.blue.500}'
    );
  });

  it('orders tokens by the collection variableIds array', async () => {
    const reordered = {
      variableCollections: [
        {
          id: 'C:1',
          name: 'Primitives',
          defaultModeId: 'm1',
          modes: [{ modeId: 'm1', name: 'Value' }],
          variableIds: ['V:2', 'V:1'],
        },
      ],
      variables: [
        {
          id: 'V:1',
          name: 'b',
          variableCollectionId: 'C:1',
          resolvedType: 'FLOAT',
          valuesByMode: { m1: 1 },
        },
        {
          id: 'V:2',
          name: 'a',
          variableCollectionId: 'C:1',
          resolvedType: 'FLOAT',
          valuesByMode: { m1: 2 },
        },
      ],
    };
    const resolver = new FileResolver(
      parseSnapshot(JSON.stringify(reordered), 'test')
    );
    const tokens: any = await getTokens(resolver, baseConfig);

    expect(Object.keys(tokens.Primitives)).toEqual(['a', 'b']);
  });
});
