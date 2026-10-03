import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const getLocalVariables = vi.fn();

vi.mock('figma-api', () => ({
  Api: class {
    getLocalVariables = getLocalVariables;
  },
}));

import { convertTokens, fetchTokens, TokensBrueckeError } from './index';
import { FileResolver, parseSnapshot } from '../cli/fileResolver';
import { resolveExportOptions } from '../cli/options';
import { getTokens } from '@common/export';

const exampleRaw = readFileSync(
  join(__dirname, '../../examples/tokens-snapshot.json'),
  'utf-8'
);
const example = JSON.parse(exampleRaw);

// What the REST API returns for the example: objects keyed by id, wrapped in
// `meta`, plus a library variable and collection that must be left out.
const toRestResponse = (snapshot: typeof example) => ({
  error: false,
  status: 200,
  meta: {
    variables: {
      ...Object.fromEntries(snapshot.variables.map((v: any) => [v.id, v])),
      'VariableID:9:9': {
        ...snapshot.variables[0],
        id: 'VariableID:9:9',
        name: 'library/color',
        remote: true,
      },
    },
    variableCollections: {
      ...Object.fromEntries(
        snapshot.variableCollections.map((c: any) => [
          c.id,
          { remote: false, hiddenFromPublishing: false, ...c },
        ])
      ),
      'VariableCollectionId:9:1': {
        id: 'VariableCollectionId:9:1',
        name: 'Library',
        remote: true,
        hiddenFromPublishing: false,
        modes: [],
        variableIds: ['VariableID:9:9'],
      },
    },
  },
});

// The REST path sorts the collection names in the metadata so an unchanged
// file exports identically; a snapshot keeps the order it was given.
const withSortedMetaCollections = (tokens: Record<string, any>) => {
  const meta = tokens.$extensions['tokens-bruecke-meta'];
  return {
    ...tokens,
    $extensions: {
      'tokens-bruecke-meta': {
        ...meta,
        variableCollections: [...meta.variableCollections].sort(),
      },
    },
  };
};

const cliResult = (options: Record<string, any>) =>
  getTokens(
    new FileResolver(parseSnapshot(exampleRaw, 'example'), () => {}),
    resolveExportOptions(options, {})
  );

beforeEach(() => {
  getLocalVariables.mockReset();
});

describe('convertTokens', () => {
  it('gives the same tokens as the CLI for the same options', async () => {
    const options = { omitCreatedAt: true, colorMode: 'rgba-css' as const };
    expect(await convertTokens(example, options)).toEqual(
      await cliResult(options)
    );
  });

  it('returns one token tree when nothing is split', async () => {
    const tokens = await convertTokens(example, { omitCreatedAt: true });
    expect(Object.keys(tokens)).toContain('Primitives');
    expect(Object.keys(tokens)).toContain('Semantic');
  });

  it('keys the result by collection with splitByCollection', async () => {
    const tokens = await convertTokens(example, { splitByCollection: true });
    expect(Object.keys(tokens).sort()).toEqual([
      'Campaign',
      'Primitives',
      'Semantic',
    ]);
  });

  it('keys the result by collection/mode with splitByMode', async () => {
    const tokens = await convertTokens(example, { splitByMode: true });
    expect(Object.keys(tokens)).toEqual(
      expect.arrayContaining(['Semantic/Light', 'Semantic/Dark'])
    );
  });

  it('accepts the raw REST variables response', async () => {
    const options = { omitCreatedAt: true };
    const fromRest = await convertTokens(toRestResponse(example), options);
    expect(withSortedMetaCollections(fromRest)).toEqual(
      withSortedMetaCollections(await convertTokens(example, options))
    );
  });

  it('maps the REST FONT_STYLE scope on numbers to a font weight', async () => {
    const response = toRestResponse({
      variableCollections: [
        {
          id: 'C:1',
          name: 'Type',
          modes: [{ modeId: 'm1', name: 'Value' }],
          variableIds: ['V:1'],
        },
      ],
      variables: [
        {
          id: 'V:1',
          name: 'weight/bold',
          variableCollectionId: 'C:1',
          resolvedType: 'FLOAT',
          scopes: ['FONT_STYLE'],
          valuesByMode: { m1: 700 },
        },
      ],
    });
    const tokens = await convertTokens(response, { omitCreatedAt: true });
    expect(tokens.Type.weight.bold.$type).toBe('fontWeight');
  });

  it('does not write to the console', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await convertTokens(example);
    await convertTokens(toRestResponse(example));
    expect(spy).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    spy.mockRestore();
    log.mockRestore();
  });

  it('rejects an invalid snapshot with INVALID_SNAPSHOT', async () => {
    const error = await convertTokens({ variables: [] } as any).catch((e) => e);
    expect(error).toBeInstanceOf(TokensBrueckeError);
    expect(error.code).toBe('INVALID_SNAPSHOT');
    expect(error.message).toMatch(/variableCollections/);
    expect(error.cause).toBeInstanceOf(Error);
  });

  it('rejects a REST response without variables', async () => {
    const error = await convertTokens({ meta: {} } as any).catch((e) => e);
    expect(error.code).toBe('INVALID_SNAPSHOT');
    expect(error.message).toMatch(/meta\.variables/);
  });
});

describe('fetchTokens', () => {
  it('fetches, converts and does not write to the console', async () => {
    getLocalVariables.mockResolvedValue(toRestResponse(example));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const tokens = await fetchTokens({
      fileKey: 'abc',
      personalAccessToken: 'token',
      options: { omitCreatedAt: true },
    });

    expect(getLocalVariables).toHaveBeenCalledWith({ file_key: 'abc' });
    expect(tokens).toEqual(
      await convertTokens(toRestResponse(example), { omitCreatedAt: true })
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('requires a file key and a token', async () => {
    const noKey = await fetchTokens({
      fileKey: '',
      personalAccessToken: 't',
    }).catch((e) => e);
    const noToken = await fetchTokens({ fileKey: 'abc' }).catch((e) => e);
    expect(noKey.code).toBe('INVALID_ARGUMENT');
    expect(noToken.code).toBe('INVALID_ARGUMENT');
  });

  it.each([
    [403, 'FIGMA_FORBIDDEN'],
    [404, 'FIGMA_NOT_FOUND'],
    [429, 'FIGMA_RATE_LIMITED'],
    [500, 'FIGMA_REQUEST_FAILED'],
  ])('maps HTTP %i to %s and keeps the original error', async (status, code) => {
    const original = Object.assign(new Error('failed'), {
      response: { status },
    });
    getLocalVariables.mockRejectedValue(original);

    const error = await fetchTokens({
      fileKey: 'abc',
      oauthToken: 'token',
    }).catch((e) => e);

    expect(error).toBeInstanceOf(TokensBrueckeError);
    expect(error.code).toBe(code);
    expect(error.cause).toBe(original);
  });
});
