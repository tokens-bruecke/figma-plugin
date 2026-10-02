import { describe, expect, test, vi } from 'vitest';

import { variablesToTokens } from './variablesToTokens';
import { IResolver } from '@common/resolver';

const red = { r: 1, g: 0, b: 0, a: 1 };
const green = { r: 0, g: 1, b: 0, a: 1 };
const blue = { r: 0, g: 0, b: 1, a: 1 };

const color = (id: string, name: string, valuesByMode: object) => ({
  id,
  name,
  resolvedType: 'COLOR',
  scopes: ['ALL_SCOPES'],
  variableCollectionId: 'core',
  valuesByMode,
  description: '',
  codeSyntax: {},
});

const collection = (id: string, extra: object = {}) => ({
  id,
  name: id,
  defaultModeId: `${id}/light`,
  modes: [
    { modeId: `${id}/light`, name: 'light' },
    { modeId: `${id}/dark`, name: 'dark' },
  ],
  ...extra,
});

// core (root) <- regional <- local
const core = collection('core', { variableIds: ['brand', 'accent', 'text'] });
const regional = collection('regional', {
  isExtension: true,
  parentVariableCollectionId: 'core',
  rootVariableCollectionId: 'core',
  variableIds: ['brand', 'accent', 'text'],
  variableOverrides: {
    brand: { 'regional/light': green, 'regional/dark': green },
    accent: { 'regional/light': green },
  },
});
const local = collection('local', {
  isExtension: true,
  parentVariableCollectionId: 'regional',
  rootVariableCollectionId: 'core',
  variableIds: ['brand', 'accent', 'text'],
  variableOverrides: {
    brand: { 'local/light': blue },
    accent: { 'local/light': null },
  },
});

const variables = [
  color('brand', 'color/brand', { 'core/light': red, 'core/dark': red }),
  color('accent', 'color/accent', { 'core/light': red, 'core/dark': red }),
  color('text', 'color/text', {
    'core/light': { type: 'VARIABLE_ALIAS', id: 'brand' },
    'core/dark': { type: 'VARIABLE_ALIAS', id: 'brand' },
  }),
] as unknown as Variable[];

const makeResolver = (
  allCollections: object[],
  allVariables: Variable[]
): IResolver =>
  ({
    getVariableById: async (id: string) =>
      allVariables.find((variable) => variable.id === id) ?? null,
    getVariableCollectionById: async (id: string) =>
      allCollections.find((candidate: any) => candidate.id === id) ?? null,
  } as unknown as IResolver);

const config = {
  colorMode: 'hex',
  useDTCG: true,
  includeValueStringKeyToAlias: false,
  includeFigmaMetaData: false,
  usePercentageOpacity: false,
  expandEasingPresets: true,
  omitCollectionNames: false,
  includeScopes: false,
} as ExportSettingsI;

const run = (
  collections: object[],
  overrides: Partial<ExportSettingsI> = {},
  allVariables = variables
) =>
  variablesToTokens(
    allVariables,
    collections as VariableCollection[],
    { ...config, ...overrides },
    makeResolver(collections, allVariables)
  );

describe('variablesToTokens extended collections', () => {
  test('an extension exports every inherited variable', async () => {
    const tokens = await run([core, regional, local]);

    expect(Object.keys(tokens['core'].color)).toStrictEqual([
      'brand',
      'accent',
      'text',
    ]);
    expect(Object.keys(tokens['local'].color)).toStrictEqual([
      'brand',
      'accent',
      'text',
    ]);
  });

  test('the root collection is unchanged by its extensions', async () => {
    const tokens = await run([core, regional, local]);

    expect(tokens['core'].color.brand.$value).toBe('#ff0000');
    expect(tokens['core'].color.text.$value).toBe('{core.color.brand}');
  });

  test('the closest override wins and the root is the fallback', async () => {
    const tokens = await run([core, regional, local]);

    // regional overrides both modes, local only light
    expect(tokens['regional'].color.brand.$value).toBe('#00ff00');
    expect(tokens['local'].color.brand.$value).toBe('#0000ff');
    expect(tokens['local'].color.brand.$extensions.mode).toStrictEqual({
      light: '#0000ff',
      dark: '#00ff00',
    });
  });

  test('a null override falls through to the parent', async () => {
    const tokens = await run([core, regional, local]);

    // local clears `accent` in light, so regional's green applies; dark reaches core
    expect(tokens['local'].color.accent.$extensions.mode).toStrictEqual({
      light: '#00ff00',
      dark: '#ff0000',
    });
  });

  test('modes are matched by name, not by id', async () => {
    const reordered = {
      ...local,
      modes: [...local.modes].reverse(),
    };
    const tokens = await run([core, regional, reordered]);

    expect(tokens['local'].color.brand.$extensions.mode.light).toBe('#0000ff');
  });

  test('aliases into the root point at the extension itself', async () => {
    const tokens = await run([core, regional, local]);

    expect(tokens['regional'].color.text.$value).toBe('{regional.color.brand}');
    expect(tokens['local'].color.text.$value).toBe('{local.color.brand}');
  });

  test('aliases into other collections are left alone', async () => {
    const palette = {
      ...collection('palette'),
      variableIds: ['palette-bg'],
    };
    const paletteVariable = {
      ...color('palette-bg', 'bg', { 'palette/light': red }),
      variableCollectionId: 'palette',
    };
    const aliasing = {
      ...color('link', 'color/link', {
        'core/light': { type: 'VARIABLE_ALIAS', id: 'palette-bg' },
        'core/dark': { type: 'VARIABLE_ALIAS', id: 'palette-bg' },
      }),
    };
    const ext = { ...regional, variableIds: ['link'], variableOverrides: {} };
    const root = { ...core, variableIds: ['link'] };

    const tokens = await run([root, palette, ext], {}, [
      aliasing,
      paletteVariable,
    ] as unknown as Variable[]);

    expect(tokens['regional'].color.link.$value).toBe('{palette.bg}');
  });

  test('inherited variables do not reorder the root collection', async () => {
    const reversedExtension = {
      ...regional,
      variableIds: ['text', 'accent', 'brand'],
    };
    const tokens = await run([core, reversedExtension]);

    expect(Object.keys(tokens['core'].color)).toStrictEqual([
      'brand',
      'accent',
      'text',
    ]);
    expect(Object.keys(tokens['regional'].color)).toStrictEqual([
      'text',
      'accent',
      'brand',
    ]);
  });

  test('an extension whose parent is missing is skipped with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tokens = await run([core, local]);

    expect(tokens['core'].color.brand.$value).toBe('#ff0000');
    expect(tokens['local'] ?? {}).toStrictEqual({});
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('extends "regional", which was not found')
    );

    warn.mockRestore();
  });

  test('extensions are skipped when collection names are omitted', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tokens = await run([core, regional, local], {
      omitCollectionNames: true,
    });

    expect(tokens['color'].brand.$value).toBe('#ff0000');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Skipped 2 extended collection(s)')
    );

    warn.mockRestore();
  });

  test('modes follow parentModeId even when the extension renames them', async () => {
    // Names swapped on purpose: matching by name would pick the wrong parent mode
    const renamed = {
      ...local,
      modes: [
        { modeId: 'local/light', name: 'dark', parentModeId: 'regional/light' },
        { modeId: 'local/dark', name: 'light', parentModeId: 'regional/dark' },
      ],
    };
    const tokens = await run([core, regional, renamed]);

    // local clears `accent` in local/light, which inherits regional/light (green)
    expect(tokens['local'].color.accent.$extensions.mode).toStrictEqual({
      dark: '#00ff00',
      light: '#ff0000',
    });
  });

  test('an extension of variables that are not local is reported', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const library = {
      ...regional,
      variableIds: ['brand', 'accent', 'text', 'library-variable'],
    };
    const tokens = await run([core, library]);

    expect(Object.keys(tokens['regional'].color)).toStrictEqual([
      'brand',
      'accent',
      'text',
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Skipped 1 variable(s) of extended collection "regional"'
      )
    );

    warn.mockRestore();
  });

  test("aliased easings are typed from the extension's own values", async () => {
    const easing = (id: string, name: string, valuesByMode: object) => ({
      ...color(id, name, valuesByMode),
      resolvedType: 'EASING',
      scopes: [],
    });
    const bezier = {
      type: 'CUSTOM_CUBIC_BEZIER',
      easingFunctionCubicBezier: { x1: 0, y1: 0, x2: 0.5, y2: 1 },
    };
    const easings = [
      easing('curve', 'easing/curve', {
        'core/light': bezier,
        'core/dark': bezier,
      }),
      easing('motion', 'easing/motion', {
        'core/light': { type: 'VARIABLE_ALIAS', id: 'curve' },
        'core/dark': { type: 'VARIABLE_ALIAS', id: 'curve' },
      }),
    ] as unknown as Variable[];
    const root = { ...core, variableIds: ['curve', 'motion'] };
    const springy = {
      ...regional,
      variableIds: ['curve', 'motion'],
      variableOverrides: {
        curve: {
          'regional/light': { type: 'GENTLE' },
          'regional/dark': { type: 'GENTLE' },
        },
      },
    };

    const tokens = await run([root, springy], {}, easings);

    expect(tokens['core'].easing.motion.$type).toBe('cubicBezier');
    expect(tokens['regional'].easing.motion.$type).toBe('string');
    expect(tokens['regional'].easing.motion.$value).toBe(
      '{regional.easing.curve}'
    );
  });
});
