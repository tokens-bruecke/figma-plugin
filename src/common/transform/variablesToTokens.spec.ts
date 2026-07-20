import { describe, expect, test } from 'vitest';

import { variablesToTokens } from './variablesToTokens';
import { IResolver } from '@common/resolver';

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
      }) as unknown as Variable;

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
