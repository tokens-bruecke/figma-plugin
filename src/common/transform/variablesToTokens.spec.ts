import { describe, expect, test } from 'vitest';

import { variablesToTokens } from './variablesToTokens';
import { IResolver } from '@common/resolver';
import { EASING_PRESET_BEZIERS } from './motion';

const collections = [
  {
    id: 'c1',
    name: 'core',
    defaultModeId: 'm1',
    modes: [{ modeId: 'm1', name: 'default' }],
  },
] as unknown as VariableCollection[];

const variables = [
  {
    name: 'spacing/sm',
    resolvedType: 'FLOAT',
    scopes: ['ALL_SCOPES'],
    variableCollectionId: 'c1',
    valuesByMode: { m1: 6 },
    description: '',
    codeSyntax: {},
    id: 'v1',
  },
  {
    name: 'flags/isCompact',
    resolvedType: 'BOOLEAN',
    scopes: [],
    variableCollectionId: 'c1',
    valuesByMode: { m1: true },
    description: '',
    codeSyntax: {},
    id: 'v2',
  },
  {
    name: 'content/brand',
    resolvedType: 'STRING',
    scopes: [],
    variableCollectionId: 'c1',
    valuesByMode: { m1: 'Acme' },
    description: '',
    codeSyntax: {},
    id: 'v3',
  },
] as unknown as Variable[];

const resolver = {} as IResolver;

const baseConfig = {
  colorMode: 'hex',
  includeValueStringKeyToAlias: false,
  includeFigmaMetaData: false,
  usePercentageOpacity: false,
  expandEasingPresets: true,
  omitCollectionNames: false,
  includeScopes: false,
} as ExportSettingsI;

describe('variablesToTokens DTCG 2025.10 format', () => {
  test('DTCG on: dimension objects, string/boolean $type always emitted', async () => {
    const tokens = await variablesToTokens(
      variables,
      collections,
      { ...baseConfig, useDTCG: true },
      resolver
    );
    const spacing = tokens['core']['spacing']['sm'];
    expect(spacing.$type).toBe('dimension');
    expect(spacing.$value).toStrictEqual({ value: 6, unit: 'px' });

    const flag = tokens['core']['flags']['isCompact'];
    expect(flag.$type).toBe('boolean');
    expect(flag.$value).toBe(true);
    expect(flag.$extensions.figmaType).toBeUndefined();

    const brand = tokens['core']['content']['brand'];
    expect(brand.$type).toBe('string');
    expect(brand.$value).toBe('Acme');
    expect(brand.$extensions.figmaType).toBeUndefined();
  });

  test('DTCG off: legacy strings and native types', async () => {
    const tokens = await variablesToTokens(
      variables,
      collections,
      { ...baseConfig, useDTCG: false },
      resolver
    );
    const spacing = tokens['core']['spacing']['sm'];
    expect(spacing.type).toBe('dimension');
    expect(spacing.value).toBe('6px');

    const flag = tokens['core']['flags']['isCompact'];
    expect(flag.type).toBe('boolean');
    expect(flag.value).toBe(true);

    const brand = tokens['core']['content']['brand'];
    expect(brand.type).toBe('string');
    expect(brand.value).toBe('Acme');
  });
});

describe('variablesToTokens motion variables', () => {
  const motionCollections = [
    {
      id: 'c1',
      name: 'motion',
      defaultModeId: 'm1',
      modes: [{ modeId: 'm1', name: 'default' }],
    },
  ] as unknown as VariableCollection[];

  const motionVariables = [
    {
      name: 'duration/medium',
      resolvedType: 'TIMING',
      scopes: [],
      variableCollectionId: 'c1',
      // float32 noise, exactly as Figma reports 0.3s
      valuesByMode: { m1: 0.30000001192092896 },
      description: '',
      codeSyntax: {},
      id: 'v1',
    },
    {
      name: 'easing/custom',
      resolvedType: 'EASING',
      scopes: [],
      variableCollectionId: 'c1',
      valuesByMode: {
        m1: {
          type: 'CUSTOM_CUBIC_BEZIER',
          easingFunctionCubicBezier: {
            x1: 0,
            y1: 0,
            x2: 0.5799999833106995,
            y2: 1,
          },
        },
      },
      description: '',
      codeSyntax: {},
      id: 'v2',
    },
    {
      name: 'easing/preset',
      resolvedType: 'EASING',
      scopes: [],
      variableCollectionId: 'c1',
      valuesByMode: { m1: { type: 'EASE_IN' } },
      description: '',
      codeSyntax: {},
      id: 'v3',
    },
    {
      name: 'easing/spring',
      resolvedType: 'EASING',
      scopes: [],
      variableCollectionId: 'c1',
      valuesByMode: { m1: { type: 'GENTLE' } },
      description: '',
      codeSyntax: {},
      id: 'v4',
    },
  ] as unknown as Variable[];

  test('DTCG on: durations and easings get motion types', async () => {
    const tokens = await variablesToTokens(
      motionVariables,
      motionCollections,
      { ...baseConfig, useDTCG: true },
      resolver
    );

    const duration = tokens['motion']['duration']['medium'];
    expect(duration.$type).toBe('duration');
    expect(duration.$value).toStrictEqual({ value: 300, unit: 'ms' });

    const custom = tokens['motion']['easing']['custom'];
    expect(custom.$type).toBe('cubicBezier');
    expect(custom.$value).toStrictEqual([0, 0, 0.58, 1]);

    const preset = tokens['motion']['easing']['preset'];
    expect(preset.$type).toBe('cubicBezier');
    expect(preset.$value).toStrictEqual(EASING_PRESET_BEZIERS.EASE_IN);

    // Springs have no DTCG equivalent and always export as names
    const spring = tokens['motion']['easing']['spring'];
    expect(spring.$type).toBe('string');
    expect(spring.$value).toBe('gentle');
  });

  test('expandEasingPresets off: named presets keep their Figma name', async () => {
    const tokens = await variablesToTokens(
      motionVariables,
      motionCollections,
      { ...baseConfig, useDTCG: true, expandEasingPresets: false },
      resolver
    );

    const preset = tokens['motion']['easing']['preset'];
    expect(preset.$type).toBe('string');
    expect(preset.$value).toBe('ease-in');
    expect(preset.$extensions.figmaType).toBe('EASING');

    // Custom beziers carry real numbers and are unaffected by the setting
    const custom = tokens['motion']['easing']['custom'];
    expect(custom.$type).toBe('cubicBezier');
    expect(custom.$value).toStrictEqual([0, 0, 0.58, 1]);
  });

  test('DTCG off: durations use the legacy ms string', async () => {
    const tokens = await variablesToTokens(
      motionVariables,
      motionCollections,
      { ...baseConfig, useDTCG: false },
      resolver
    );

    const duration = tokens['motion']['duration']['medium'];
    expect(duration.type).toBe('duration');
    expect(duration.value).toBe('300ms');
  });

  test('an aliased easing takes its type from the variable it points at', async () => {
    const springVariable = motionVariables[3];
    const aliasVariable = {
      name: 'easing/alias',
      resolvedType: 'EASING',
      scopes: [],
      variableCollectionId: 'c1',
      valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'v4' } },
      description: '',
      codeSyntax: {},
      id: 'v5',
    } as unknown as Variable;

    const aliasResolver = {
      getVariableById: async (id: string) =>
        id === 'v4' ? springVariable : null,
      getVariableCollectionById: async () => motionCollections[0],
    } as unknown as IResolver;

    const tokens = await variablesToTokens(
      [springVariable, aliasVariable],
      motionCollections,
      { ...baseConfig, useDTCG: true },
      aliasResolver
    );

    const alias = tokens['motion']['easing']['alias'];
    expect(alias.$type).toBe('string');
    expect(alias.$value).toBe('{motion.easing.spring}');
  });
});

describe('variablesToTokens ordering', () => {
  test('tokens follow the collection variableIds order (Figma UI order)', async () => {
    const orderedCollections = [
      {
        id: 'c1',
        name: 'core',
        defaultModeId: 'm1',
        modes: [{ modeId: 'm1', name: 'default' }],
        variableIds: ['v-xs', 'v-sm', 'v-xl10'],
      },
    ] as unknown as VariableCollection[];

    const makeVar = (id: string, name: string, value: number) =>
      ({
        name,
        resolvedType: 'FLOAT',
        scopes: ['ALL_SCOPES'],
        variableCollectionId: 'c1',
        valuesByMode: { m1: value },
        description: '',
        codeSyntax: {},
        id,
      } as unknown as Variable);

    // Variables arrive in a different order than defined in the collection
    const unorderedVariables = [
      makeVar('v-xl10', 'spacing/xl10', 128),
      makeVar('v-xs', 'spacing/xs', 2),
      makeVar('v-sm', 'spacing/sm', 6),
    ];

    const tokens = await variablesToTokens(
      unorderedVariables,
      orderedCollections,
      { ...baseConfig, useDTCG: false },
      resolver
    );

    expect(Object.keys(tokens['core']['spacing'])).toStrictEqual([
      'xs',
      'sm',
      'xl10',
    ]);
  });
});
