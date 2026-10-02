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
