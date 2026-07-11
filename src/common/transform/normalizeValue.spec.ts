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
