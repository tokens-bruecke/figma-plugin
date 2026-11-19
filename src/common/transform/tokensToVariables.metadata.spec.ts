import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { IResolver } from '@common/resolver';
import { tokensToVariables } from './tokensToVariables';

/**
 * In-memory stand-in for the variable API, with code syntax and scopes, so
 * the Figma metadata of an export can be imported under vitest.
 */
const createFakeFigma = () => {
  const collections: any[] = [];
  const variables: any[] = [];
  let nextId = 1;

  const createVariableCollection = (name: string) => {
    const collection = {
      id: `VariableCollectionId:${nextId++}`,
      name,
      modes: [{ modeId: `${nextId++}:0`, name: 'Mode 1' }],
      variableIds: [] as string[],
      get defaultModeId() {
        return this.modes[0].modeId;
      },
      renameMode(modeId: string, newName: string) {
        this.modes.find((m: any) => m.modeId === modeId).name = newName;
      },
      addMode(name: string) {
        this.modes.push({ modeId: `${nextId++}:0`, name });
      },
    };
    collections.push(collection);
    return collection;
  };

  const createVariable = (name: string, collection: any, type: string) => {
    const variable = {
      id: `VariableID:${nextId++}`,
      name,
      variableCollectionId: collection.id,
      resolvedType: type,
      valuesByMode: {} as Record<string, any>,
      scopes: ['ALL_SCOPES'],
      description: '',
      codeSyntax: {} as Record<string, string>,
      setValueForMode(modeId: string, value: any) {
        this.valuesByMode[modeId] = value;
      },
      setVariableCodeSyntax(platform: string, value: string) {
        this.codeSyntax[platform] = value;
      },
      removeVariableCodeSyntax(platform: string) {
        delete this.codeSyntax[platform];
      },
    };
    collection.variableIds.push(variable.id);
    variables.push(variable);
    return variable;
  };

  return {
    variables: {
      createVariableCollection,
      createVariable,
      getVariableCollectionByIdAsync: async (id: string) =>
        collections.find((c) => c.id === id) ?? null,
    },
    _collections: collections,
    _variables: variables,
  };
};

describe('tokensToVariables with Figma metadata', () => {
  let fake: ReturnType<typeof createFakeFigma>;

  // A new file, then the same file after the first import
  const emptyResolver = {
    getLocalVariableCollections: async () => [],
    getLocalVariables: async () => [],
  } as unknown as IResolver;
  const fileResolver = {
    getLocalVariableCollections: async () => fake._collections,
    getLocalVariables: async () => fake._variables,
  } as unknown as IResolver;

  const byName = (name: string) => fake._variables.find((v) => v.name === name);

  const colorToken = (extra: any = {}, figma: any = {}) => ({
    $type: 'color',
    $value: '#ff0000',
    ...extra,
    $extensions: { figma },
  });

  beforeEach(() => {
    fake = createFakeFigma();
    vi.stubGlobal('figma', fake);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('restores the code syntax of each platform', async () => {
    const result = await tokensToVariables(
      {
        core: {
          red: colorToken(
            {},
            { codeSyntax: { WEB: 'var(--red)', iOS: 'Color.red' } }
          ),
        },
      },
      emptyResolver
    );

    expect(result.errors).toEqual([]);
    expect(byName('red').codeSyntax).toEqual({
      WEB: 'var(--red)',
      iOS: 'Color.red',
    });
  });

  test('clears the platforms an import leaves out', async () => {
    const tokens = (codeSyntax: any) => ({
      core: { red: colorToken({}, { codeSyntax }) },
    });

    await tokensToVariables(
      tokens({ WEB: 'var(--red)', ANDROID: 'red' }),
      emptyResolver
    );
    const again = await tokensToVariables(
      tokens({ WEB: 'var(--red-500)' }),
      fileResolver
    );

    expect(again.errors).toEqual([]);
    expect(fake._variables).toHaveLength(1);
    expect(byName('red').codeSyntax).toEqual({ WEB: 'var(--red-500)' });
  });

  test('leaves the code syntax alone without Figma metadata', async () => {
    await tokensToVariables(
      { core: { red: colorToken({}, { codeSyntax: { WEB: 'var(--red)' } }) } },
      emptyResolver
    );
    await tokensToVariables(
      { core: { red: { $type: 'color', $value: '#00ff00' } } },
      fileResolver
    );

    expect(byName('red').codeSyntax).toEqual({ WEB: 'var(--red)' });
  });

  test('hides a variable whose scopes are empty', async () => {
    const result = await tokensToVariables(
      {
        ramps: {
          gray: colorToken({ scopes: [] }),
          blue: colorToken({ scopes: ['FRAME_FILL'] }),
          plain: { $type: 'color', $value: '#000000' },
        },
      },
      emptyResolver
    );

    expect(result.errors).toEqual([]);
    expect(byName('gray').scopes).toEqual([]);
    expect(byName('blue').scopes).toEqual(['FRAME_FILL']);
    // Without scopes in the token, a new variable keeps Figma's default
    expect(byName('plain').scopes).toEqual(['ALL_SCOPES']);
  });

  test('keeps the scopes when none of them is valid', async () => {
    const result = await tokensToVariables(
      { ramps: { gray: colorToken({ scopes: ['NOT_A_SCOPE'] }) } },
      emptyResolver
    );

    expect(result.errors).toEqual([
      'Token at path "gray" has invalid scopes: NOT_A_SCOPE',
    ]);
    expect(byName('gray').scopes).toEqual(['ALL_SCOPES']);
  });
});
