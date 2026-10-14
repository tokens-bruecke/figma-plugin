import { describe, it, expect } from 'vitest';
import { gridStylesToTokens } from '@common/transform/styles/gridStylesToTokens';
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

  it('leaves out bound variables that are not part of a text style', () => {
    const result = toText({
      id: '1:2',
      name: 'Body',
      style,
      boundVariables: {
        fontSize: [{ type: 'VARIABLE_ALIAS', id: 'VariableID:3:4' }],
        fills: [{ type: 'VARIABLE_ALIAS', id: 'VariableID:3:6' }],
      },
    });

    expect(Object.keys(result.boundVariables)).toEqual(['fontSize']);
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
      getFile: async () => ({
        styles: { '1:1': { styleType: 'FILL', remote: false } },
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

describe('file styles', () => {
  const style = (styleType: string, remote = false) => ({
    key: 'key',
    name: 'name',
    description: '',
    styleType,
    remote,
  });

  const resolverWithStyles = (styles: Record<string, any>) => {
    const resolver = new RestAPIResolver('file-key', 'token');
    const calls = { file: [] as any[], nodes: [] as string[] };

    (resolver as any).api = {
      getFile: async (_: unknown, query: any) => {
        calls.file.push(query);
        return { styles };
      },
      getFileNodes: async (_: unknown, { ids }: { ids: string }) => {
        if (!ids) {
          throw new Error('Request failed with status code 400');
        }
        calls.nodes.push(ids);
        return {
          nodes: Object.fromEntries(
            ids.split(',').map((id) => [
              id,
              { document: { id, name: `style/${id}`, fills: [] } },
            ])
          ),
        };
      },
    };

    return { resolver, calls };
  };

  it('reads the styles of the file itself, published or not', async () => {
    const { resolver, calls } = resolverWithStyles({
      '1:2': style('FILL'),
      '1:3': style('FILL'),
      '1:4': style('TEXT'),
    });

    expect((await resolver.getLocalPaintStyles()).map((s) => s.id)).toEqual([
      '1:2',
      '1:3',
    ]);
    expect(calls.nodes).toEqual(['1:2,1:3']);
    expect(calls.file).toEqual([{ depth: 2 }]);
  });

  it('leaves out library styles the file uses', async () => {
    const { resolver } = resolverWithStyles({
      '1:2': style('FILL'),
      '9:9': style('FILL', true),
    });

    expect((await resolver.getLocalPaintStyles()).map((s) => s.id)).toEqual([
      '1:2',
    ]);
  });

  it('returns no styles of a type the file has none of, without calling /nodes', async () => {
    const { resolver, calls } = resolverWithStyles({ '1:2': style('FILL') });

    expect(await resolver.getLocalTextStyles()).toEqual([]);
    expect(await resolver.getLocalEffectStyles()).toEqual([]);
    expect(await resolver.getLocalGridStyles()).toEqual([]);
    expect(calls.nodes).toEqual([]);
  });

  it('tolerates a file response without a styles map', async () => {
    const { resolver } = resolverWithStyles(undefined as any);

    expect(await resolver.getLocalPaintStyles()).toEqual([]);
  });

  it('requests the file once for every style type', async () => {
    const { resolver, calls } = resolverWithStyles({});

    await Promise.all([
      resolver.getLocalTextStyles(),
      resolver.getLocalGridStyles(),
    ]);
    await resolver.getLocalPaintStyles();

    expect(calls.file).toHaveLength(1);
  });
});

const toGrid = (layoutGrids: any[]) =>
  RestAPIResolver.prototype.frameNodeToGrid.call(null, {
    id: '1:2',
    name: 'grid',
    layoutGrids,
  } as any) as any;

describe('frameNodeToGrid', () => {
  const color = { r: 1, g: 0, b: 0, a: 0.1 };

  it('gives a GRID pattern only its cell size, like the Plugin API', () => {
    const style = toGrid([
      {
        pattern: 'GRID',
        sectionSize: 8,
        visible: true,
        color,
        alignment: 'MIN',
        gutterSize: 0,
        offset: 0,
        count: -1,
      },
    ]);

    expect(style.layoutGrids).toEqual([
      { pattern: 'GRID', sectionSize: 8, visible: true, color },
    ]);
  });

  it('turns an "Auto" count of -1 into Infinity', () => {
    const [grid] = toGrid([
      {
        pattern: 'COLUMNS',
        sectionSize: 80,
        visible: true,
        color,
        alignment: 'MIN',
        gutterSize: 16,
        offset: 24,
        count: -1,
      },
    ]).layoutGrids;

    expect(grid).toEqual({
      pattern: 'COLUMNS',
      alignment: 'MIN',
      gutterSize: 16,
      count: Infinity,
      sectionSize: 80,
      offset: 24,
      visible: true,
      color,
    });
  });

  it('keeps a fixed count', () => {
    const [grid] = toGrid([
      {
        pattern: 'ROWS',
        sectionSize: 10,
        visible: true,
        color,
        alignment: 'MIN',
        gutterSize: 8,
        offset: 0,
        count: 5,
      },
    ]).layoutGrids;

    expect(grid.count).toBe(5);
  });

  it('leaves out the section size of a stretched grid and the offset of a centered one', () => {
    const [stretched, centered] = toGrid([
      {
        pattern: 'COLUMNS',
        sectionSize: 10,
        visible: true,
        color,
        alignment: 'STRETCH',
        gutterSize: 20,
        offset: 32,
        count: 12,
      },
      {
        pattern: 'ROWS',
        sectionSize: 40,
        visible: true,
        color,
        alignment: 'CENTER',
        gutterSize: 20,
        offset: 0,
        count: 4,
      },
    ]).layoutGrids;

    expect(stretched).not.toHaveProperty('sectionSize');
    expect(stretched.offset).toBe(32);
    expect(centered).not.toHaveProperty('offset');
    expect(centered.sectionSize).toBe(40);
  });

  it('renames the bound numSections variable to count', () => {
    const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
    const [columns, square] = toGrid([
      {
        pattern: 'COLUMNS',
        sectionSize: 10,
        visible: true,
        color,
        alignment: 'STRETCH',
        gutterSize: 20,
        offset: 32,
        count: 12,
        boundVariables: {
          numSections: alias('VariableID:1:1'),
          gutterSize: alias('VariableID:1:2'),
        },
      },
      {
        pattern: 'GRID',
        sectionSize: 8,
        visible: true,
        color,
        alignment: 'MIN',
        gutterSize: 0,
        offset: 0,
        count: -1,
        boundVariables: { sectionSize: alias('VariableID:1:3') },
      },
    ]).layoutGrids;

    expect(columns.boundVariables).toEqual({
      count: alias('VariableID:1:1'),
      gutterSize: alias('VariableID:1:2'),
    });
    expect(square.boundVariables).toEqual({
      sectionSize: alias('VariableID:1:3'),
    });
  });
});

describe('grid tokens', () => {
  const color = { r: 1, g: 0, b: 0, a: 0.1 };

  // Exported and serialized the way the plugin UI and the CLI do it.
  const exportGrid = async (layoutGrids: any[]) => {
    const resolver = {
      getLocalGridStyles: async () => [{ name: 'grid', layoutGrids }],
    } as any;
    const tokens: any = await gridStylesToTokens('grids', true, resolver);
    return JSON.parse(JSON.stringify(tokens.grids.grid.$value));
  };

  it('match the plugin for a GRID pattern', async () => {
    const fromRest = await exportGrid(
      toGrid([
        {
          pattern: 'GRID',
          sectionSize: 8,
          visible: true,
          color,
          alignment: 'MIN',
          gutterSize: 0,
          offset: 0,
          count: -1,
        },
      ]).layoutGrids
    );
    const fromPlugin = await exportGrid([
      { pattern: 'GRID', sectionSize: 8, visible: true, color },
    ]);

    expect(fromRest).toEqual(fromPlugin);
    expect(fromRest).not.toHaveProperty('columnCount');
  });

  it('match the plugin for an "Auto" count', async () => {
    const grid = {
      pattern: 'COLUMNS',
      visible: true,
      color,
      alignment: 'STRETCH',
      gutterSize: 16,
      offset: 24,
    };

    const fromRest = await exportGrid(
      toGrid([{ ...grid, sectionSize: 10, count: -1 }]).layoutGrids
    );
    const fromPlugin = await exportGrid([{ ...grid, count: Infinity }]);

    expect(fromRest).toEqual(fromPlugin);
    expect(fromRest.columnCount).not.toBe(-1);
  });
});
