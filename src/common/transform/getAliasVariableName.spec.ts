import { describe, expect, it, vi } from 'vitest';

import { IResolver } from '@common/resolver';
import { getAliasVariableName } from './getAliasVariableName';

const resolverWith = (
  variable: Partial<Variable> | null,
  collection: Partial<VariableCollection> | null
) =>
  ({
    getVariableById: async () => variable,
    getVariableCollectionById: async () => collection,
    warn: vi.fn(),
  } as unknown as IResolver);

describe('getAliasVariableName', () => {
  it('builds the alias from the collection and the variable name', async () => {
    const resolver = resolverWith(
      { name: 'blue/500', variableCollectionId: 'c1' },
      { name: 'Primitives' }
    );

    expect(await getAliasVariableName('v1', true, false, resolver)).toBe(
      '{Primitives.blue.500}'
    );
  });

  it('exports "#missing#" when the variable is unknown', async () => {
    const resolver = resolverWith(null, null);

    expect(await getAliasVariableName('v1', true, false, resolver)).toBe(
      '#missing#'
    );
    expect(resolver.warn).toHaveBeenCalledOnce();
  });

  // A library variable added to a snapshot without its collection, or a
  // variable whose collection a resolver leaves out, must not make the
  // variable that aliases it throw and get skipped
  it('exports "#missing#" when the collection is unknown', async () => {
    const resolver = resolverWith(
      { name: 'blue/500', variableCollectionId: 'lib' },
      null
    );

    expect(await getAliasVariableName('v1', true, false, resolver)).toBe(
      '#missing#'
    );
    expect(resolver.warn).toHaveBeenCalledWith(
      expect.stringContaining('[tokens-bruecke]')
    );
  });
});
