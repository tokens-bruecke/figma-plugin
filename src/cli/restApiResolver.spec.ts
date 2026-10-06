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

const toText = (node: any) =>
  RestAPIResolver.prototype.textNodeToStyle.call(null, node) as any;

describe('textNodeToStyle', () => {
  const style = {
    fontFamily: 'Roboto',
    fontStyle: 'Regular',
    fontWeight: 400,
    fontSize: 16,
    letterSpacing: 0,
    lineHeightUnit: 'PIXELS',
    lineHeightPx: 20,
  };

  it('turns the REST bound variable arrays into single aliases', () => {
    const result = toText({
      id: '1:2',
      name: 'Body',
      style,
      boundVariables: {
        fontSize: [{ type: 'VARIABLE_ALIAS', id: 'VariableID:3:4' }],
        fontFamily: [{ type: 'VARIABLE_ALIAS', id: 'VariableID:3:5' }],
      },
    });

    expect(result.boundVariables.fontSize.id).toBe('VariableID:3:4');
    expect(result.boundVariables.fontFamily.id).toBe('VariableID:3:5');
  });

  it('tolerates a node without bound variables', () => {
    expect(toText({ id: '1:2', name: 'Body', style }).boundVariables).toEqual(
      {}
    );
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
      {
        'VariableCollectionId:2': collection('VariableCollectionId:2', 'wl'),
        'VariableCollectionId:1': collection(
          'VariableCollectionId:1',
          'surface'
        ),
      }
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

describe('getLocalVariables scopes', () => {
  it('reads a number reported as FONT_STYLE as FONT_WEIGHT', async () => {
    const [weight] = await resolverWith({
      a: variable('a', 'FLOAT', ['FONT_STYLE']),
    }).getLocalVariables();

    expect(weight.scopes).toEqual(['FONT_WEIGHT']);
  });

  it('only replaces the scope, not the others next to it', async () => {
    const [weight] = await resolverWith({
      a: variable('a', 'FLOAT', ['FONT_SIZE', 'FONT_STYLE']),
    }).getLocalVariables();

    expect(weight.scopes).toEqual(['FONT_SIZE', 'FONT_WEIGHT']);
  });

  it('leaves FONT_STYLE on a string variable alone', async () => {
    const [style] = await resolverWith({
      a: variable('a', 'STRING', ['FONT_STYLE']),
    }).getLocalVariables();

    expect(style.scopes).toEqual(['FONT_STYLE']);
  });

  it('leaves the other scopes of a number alone', async () => {
    const variables = await resolverWith({
      a: variable('a', 'FLOAT', ['ALL_SCOPES']),
      b: variable('b', 'FLOAT', ['FONT_WEIGHT']),
      c: variable('c', 'COLOR', ['ALL_FILLS']),
    }).getLocalVariables();

    expect(variables.map((v) => v.scopes)).toEqual([
      ['ALL_SCOPES'],
      ['FONT_WEIGHT'],
      ['ALL_FILLS'],
    ]);
  });
});

describe('style order', () => {
  it('returns styles sorted by name, whatever order the API used', async () => {
    const resolver = new RestAPIResolver('file-key', 'token');
    const node = (id: string, name: string) => ({
      document: { id, name, fills: [] },
    });

    (resolver as any).api = {
      getFileStyles: async () => ({
        meta: { styles: [{ style_type: 'FILL', node_id: '1' }] },
      }),
      getFileNodes: async () => ({
        nodes: {
          '2:1': node('2:1', 'brand/secondary'),
          '1:1': node('1:1', 'brand/primary'),
        },
      }),
    };

    const styles = await resolver.getLocalPaintStyles();

    expect(styles.map((s) => s.name)).toEqual([
      'brand/primary',
      'brand/secondary',
    ]);
  });
});
