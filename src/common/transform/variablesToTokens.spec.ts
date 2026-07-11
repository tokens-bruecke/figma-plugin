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
  test('DTCG on: dimension objects, no string/boolean $type', async () => {
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
    expect(flag.$type).toBeUndefined();
    expect(flag.$value).toBe(true);
    expect(flag.$extensions.figmaType).toBe('BOOLEAN');

    const brand = tokens['core']['content']['brand'];
    expect(brand.$type).toBeUndefined();
    expect(brand.$value).toBe('Acme');
    expect(brand.$extensions.figmaType).toBe('STRING');
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
