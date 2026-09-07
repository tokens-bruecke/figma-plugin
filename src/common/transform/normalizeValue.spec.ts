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
          useDTCG: false,
          includeValueStringKeyToAlias: false,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toBe('0.4px');
  });

  test('Lossy float in DTCG format', async () => {
    expect(
      await normalizeValue(
        {
          variableValue: 0.40000000200345043,
          variableType: 'FLOAT',
          variableScope: [],
          colorMode: 'hex',
          useDTCG: true,
          includeValueStringKeyToAlias: false,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toStrictEqual({ value: 0.4, unit: 'px' });
  });

  test('Numeric font weight', async () => {
    expect(
      await normalizeValue(
        {
          variableValue: 600,
          variableType: 'FLOAT',
          variableScope: ['FONT_WEIGHT'],
          colorMode: 'hex',
          useDTCG: true,
          includeValueStringKeyToAlias: true,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toBe(600);
  });
});

describe('getColor', () => {
  test('RGBA to hex', async () => {
    expect(
      await normalizeValue(
        {
          variableValue: { r: 0.4, g: 0.2, b: 0.6, a: 1 },
          variableType: 'COLOR',
          variableScope: ['ALL_SCOPES'],
          colorMode: 'hex',
          useDTCG: true,
          includeValueStringKeyToAlias: true,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toBe('#663399');
  });

  test('RGBA to RGBA CSS', async () => {
    expect(
      await normalizeValue(
        {
          variableValue: { r: 0.4, g: 0.2, b: 0.6, a: 1 },
          variableType: 'COLOR',
          variableScope: ['ALL_SCOPES'],
          colorMode: 'rgba-css',
          useDTCG: true,
          includeValueStringKeyToAlias: true,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toBe('rgb(102, 51, 153)');
  });

  test('RGBA to RGBA object', async () => {
    expect(
      await normalizeValue(
        {
          variableValue: { r: 0.4, g: 0.2, b: 0.6, a: 1 },
          variableType: 'COLOR',
          variableScope: ['ALL_SCOPES'],
          colorMode: 'rgba-object',
          useDTCG: true,
          includeValueStringKeyToAlias: true,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toStrictEqual({ r: 102, g: 51, b: 153, a: 1 });
  });

  test('RGBA to sRGB DTCG object', async () => {
    expect(
      await normalizeValue(
        {
          variableValue: { r: 0.4, g: 0.2, b: 0.6, a: 1 },
          variableType: 'COLOR',
          variableScope: ['ALL_SCOPES'],
          colorMode: 'srgb-dtcg',
          useDTCG: true,
          includeValueStringKeyToAlias: true,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toStrictEqual({
      alpha: 1,
      colorSpace: 'srgb',
      components: [0.4, 0.2, 0.6],
      hex: '#663399',
    });
  });

  test('RGBA to HSLA CSS', async () => {
    expect(
      await normalizeValue(
        {
          variableValue: { r: 0.4, g: 0.2, b: 0.6, a: 1 },
          variableType: 'COLOR',
          variableScope: ['ALL_SCOPES'],
          colorMode: 'hsla-css',
          useDTCG: true,
          includeValueStringKeyToAlias: true,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toBe('hsla(270, 50%, 40%, 1)');
  });

  test('RGBA to HSLA object', async () => {
    expect(
      await normalizeValue(
        {
          variableValue: { r: 0.4, g: 0.2, b: 0.6, a: 1 },
          variableType: 'COLOR',
          variableScope: ['ALL_SCOPES'],
          colorMode: 'hsla-object',
          useDTCG: true,
          includeValueStringKeyToAlias: true,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toStrictEqual({
      h: 270,
      l: 40,
      s: 50,
      a: 1,
    });
  });

  test('RGBA to HSLA DTCG object', async () => {
    expect(
      await normalizeValue(
        {
          variableValue: { r: 0.4, g: 0.2, b: 0.6, a: 1 },
          variableType: 'COLOR',
          variableScope: ['ALL_SCOPES'],
          colorMode: 'hsl-dtcg',
          useDTCG: true,
          includeValueStringKeyToAlias: true,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toStrictEqual({
      alpha: 1,
      colorSpace: 'hsl',
      components: [270, 50, 40],
      hex: '#663399',
    });
  });

  test('RGBA to OKLCH DTCG object', async () => {
    expect(
      await normalizeValue(
        {
          variableValue: { r: 0.4, g: 0.2, b: 0.6, a: 1 },
          variableType: 'COLOR',
          variableScope: ['ALL_SCOPES'],
          colorMode: 'oklch-dtcg',
          useDTCG: true,
          includeValueStringKeyToAlias: true,
          usePercentageOpacity: false,
        },
        resolver
      )
    ).toStrictEqual({
      alpha: 1,
      colorSpace: 'oklch',
      components: [0.4403, 0.1603, 303.37],
      hex: '#663399',
    });
  });
});

describe('composed colors (color alias with opacity)', () => {
  const variables: Record<string, Partial<Variable>> = {
    'VariableID:1': {
      id: 'VariableID:1',
      name: 'brand/blue',
      variableCollectionId: 'C:1',
    },
    'VariableID:2': {
      id: 'VariableID:2',
      name: 'opacity/50',
      variableCollectionId: 'C:1',
    },
  };
  const aliasResolver = {
    getVariableById: async (id: string) => (variables[id] ?? null) as Variable,
    getVariableCollectionById: async () =>
      ({ id: 'C:1', name: 'Primitives' } as VariableCollection),
  } as unknown as IResolver;

  const compose = (base: any, opacity: any) => ({
    type: 'VARIABLE_EXPRESSION',
    expressionFunction: 'COMPOSE_COLOR',
    expressionArguments: [base, opacity],
  });
  const blueAlias = { type: 'VARIABLE_ALIAS', id: 'VariableID:1' };
  const opacityAlias = { type: 'VARIABLE_ALIAS', id: 'VariableID:2' };
  const red = { r: 1, g: 0, b: 0, a: 1 };

  const normalize = (
    variableValue: any,
    overrides: Partial<Parameters<typeof normalizeValue>[0]> = {}
  ) =>
    normalizeValue(
      {
        variableValue,
        variableType: 'COLOR',
        variableScope: ['ALL_SCOPES'],
        colorMode: 'hex',
        useDTCG: true,
        includeValueStringKeyToAlias: false,
        usePercentageOpacity: false,
        ...overrides,
      },
      aliasResolver
    );

  test('alias base with a literal opacity', async () => {
    expect(await normalize(compose(blueAlias, 50))).toStrictEqual({
      components: '{Primitives.brand.blue}',
      alpha: 0.5,
    });
  });

  test('alias base with an aliased opacity', async () => {
    expect(await normalize(compose(blueAlias, opacityAlias))).toStrictEqual({
      components: '{Primitives.brand.blue}',
      alpha: '{Primitives.opacity.50}',
    });
  });

  test('respects the percentage opacity setting', async () => {
    expect(
      await normalize(compose(blueAlias, 33.3), { usePercentageOpacity: true })
    ).toStrictEqual({
      components: '{Primitives.brand.blue}',
      alpha: '33.3%',
    });
  });

  test('respects the .value alias suffix and omitted collection names', async () => {
    expect(
      await normalize(compose(blueAlias, opacityAlias), {
        includeValueStringKeyToAlias: true,
        omitCollectionNames: true,
      })
    ).toStrictEqual({
      components: '{brand.blue.$value}',
      alpha: '{opacity.50.$value}',
    });
  });

  test('unresolvable alias base falls back to the missing marker', async () => {
    expect(
      await normalize(
        compose({ type: 'VARIABLE_ALIAS', id: 'VariableID:404' }, 50)
      )
    ).toStrictEqual({ components: '#missing#', alpha: 0.5 });
  });

  test('literal base with a literal opacity bakes the alpha in', async () => {
    expect(await normalize(compose(red, 50))).toBe('#ff000080');
    expect(
      await normalize(compose(red, 50), { colorMode: 'srgb-dtcg' })
    ).toStrictEqual({
      colorSpace: 'srgb',
      components: [1, 0, 0],
      alpha: 0.5,
      hex: '#ff000080',
    });
  });

  test('literal base with an aliased opacity, DTCG color mode', async () => {
    expect(
      await normalize(compose(red, opacityAlias), { colorMode: 'srgb-dtcg' })
    ).toStrictEqual({
      colorSpace: 'srgb',
      components: [1, 0, 0],
      alpha: '{Primitives.opacity.50}',
      hex: '#ff0000',
    });
  });

  test('literal base with an aliased opacity, object color mode', async () => {
    expect(
      await normalize(compose(red, opacityAlias), { colorMode: 'rgba-object' })
    ).toStrictEqual({ r: 255, g: 0, b: 0, a: '{Primitives.opacity.50}' });
  });

  test('literal base with an aliased opacity, string color mode', async () => {
    expect(
      await normalize(compose(red, opacityAlias), { colorMode: 'rgba-css' })
    ).toStrictEqual({
      components: 'rgb(255, 0, 0)',
      alpha: '{Primitives.opacity.50}',
    });
  });
});

describe('opacity scopes', () => {
  test('COLOR_OPACITY floats export like OPACITY floats', async () => {
    const props = {
      variableValue: 50,
      variableType: 'FLOAT' as const,
      variableScope: ['COLOR_OPACITY' as VariableScope],
      colorMode: 'hex' as const,
      useDTCG: true,
      includeValueStringKeyToAlias: false,
      usePercentageOpacity: false,
    };
    expect(await normalizeValue(props, resolver)).toBe(0.5);
    expect(
      await normalizeValue({ ...props, usePercentageOpacity: true }, resolver)
    ).toBe('50%');
    expect(
      await normalizeValue(
        {
          ...props,
          variableScope: ['OPACITY', 'COLOR_OPACITY' as VariableScope],
        },
        resolver
      )
    ).toBe(0.5);
  });
});
