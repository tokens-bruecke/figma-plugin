import { describe, it, expect } from 'vitest';
import { RestAPIResolver } from './restApiResolver';

const toPaint = (node: any) =>
  RestAPIResolver.prototype.rectangleNodeToPaint.call(null, node) as any;

describe('rectangleNodeToPaint', () => {
  it('maps REST per-paint bound variables onto the style', () => {
    const style = toPaint({
      id: '1:2',
      name: 'Primary',
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0 },
          boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'VariableID:3:4' } },
        },
      ],
    });

    expect(style.boundVariables.paints[0].id).toBe('VariableID:3:4');
    expect(style.paints).toHaveLength(1);
  });

  it('omits boundVariables when no paint is bound', () => {
    const style = toPaint({
      id: '1:2',
      name: 'Primary',
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
    });

    expect(style.boundVariables).toBeUndefined();
  });

  it('tolerates a node without fills', () => {
    expect(toPaint({ id: '1:2', name: 'Empty' }).paints).toEqual([]);
  });
});

const resolverWith = (
  variables: Record<string, any>,
  variableCollections: Record<string, any> = {}
) => {
  const resolver = new RestAPIResolver('file-key', 'token');

  (resolver as any).api = {
    getLocalVariables: async () => ({
      meta: { variables, variableCollections },
    }),
  };

  return resolver;
};

const variable = (id: string, resolvedType: string, scopes: string[]) => ({
  id,
  name: `variable/${id}`,
  resolvedType,
  scopes,
  remote: false,
  valuesByMode: {},
});

describe('order', () => {
  const named = (id: string, name: string) => ({
    ...variable(id, 'FLOAT', ['ALL_SCOPES']),
    name,
  });

  it('returns variables sorted by name, whatever order the API used', async () => {
    const one = {
      c: named('c', 'space/large'),
      a: named('a', 'color/brand'),
      b: named('b', 'space/small'),
    };
    const other = {
      b: one.b,
      c: one.c,
      a: one.a,
    };

    const names = async (variables: Record<string, any>) =>
      (await resolverWith(variables).getLocalVariables()).map((v) => v.name);

    expect(await names(one)).toEqual([
      'color/brand',
      'space/large',
      'space/small',
    ]);
    expect(await names(other)).toEqual(await names(one));
  });

  it('breaks ties between equal names by id', async () => {
    const variables = await resolverWith({
      b: named('b', 'same'),
      a: named('a', 'same'),
    }).getLocalVariables();

    expect(variables.map((v) => v.id)).toEqual(['a', 'b']);
  });

  it('returns collections sorted by name', async () => {
    const collection = (id: string, name: string) => ({
      id,
      name,
      remote: false,
      hiddenFromPublishing: false,
    });
    const collections = await resolverWith(
      {},
      { 2: collection('2', 'wl'), 1: collection('1', 'surface') }
    ).getLocalVariableCollections();

    expect(collections.map((c) => c.name)).toEqual(['surface', 'wl']);
  });

  it('returns the variableIds of a collection sorted by variable name', async () => {
    const variables = {
      c: { ...named('c', 'space/large'), variableCollectionId: '1' },
      a: { ...named('a', 'color/brand'), variableCollectionId: '1' },
      b: { ...named('b', 'space/small'), variableCollectionId: '1' },
    };
    const [collection] = await resolverWith(variables, {
      1: {
        id: '1',
        name: 'wl',
        remote: false,
        hiddenFromPublishing: false,
        variableIds: ['b', 'c', 'a'],
      },
    }).getLocalVariableCollections();

    expect(collection.variableIds).toEqual(['a', 'c', 'b']);
  });
});
