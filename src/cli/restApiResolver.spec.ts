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

const resolverWith = (variables: Record<string, any>) => {
  const resolver = new RestAPIResolver('file-key', 'token');

  (resolver as any).api = {
    getLocalVariables: async () => ({
      meta: { variables, variableCollections: {} },
    }),
  };

  return resolver;
};

const variable = (id: string, resolvedType: string, scopes: string[]) => ({
  id,
  name: `weight/${id}`,
  resolvedType,
  scopes,
  remote: false,
  valuesByMode: {},
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
