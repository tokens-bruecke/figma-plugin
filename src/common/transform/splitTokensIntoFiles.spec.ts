import { describe, expect, it } from 'vitest';

import { splitTokensIntoFiles } from './splitTokensIntoFiles';

const tokens = {
  Colors: { red: { $value: '#f00' } },
  Spacing: { sm: { $value: '4px' } },
};

const byMode = {
  'Colors/Light': { red: { $value: '#f00' } },
  'Colors/Dark': { red: { $value: '#900' } },
};

describe('splitTokensIntoFiles', () => {
  it('returns a single file when nothing is split', () => {
    const files = splitTokensIntoFiles(tokens, {}, 'tokens/design.tokens.json');

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('tokens/design.tokens.json');
    expect(JSON.parse(files[0].content)).toEqual(tokens);
  });

  it('falls back to a default name without a target', () => {
    expect(splitTokensIntoFiles(tokens)[0].path).toBe('design.tokens.json');
  });

  it('writes one file per collection', () => {
    const files = splitTokensIntoFiles(
      tokens,
      { splitByCollection: true },
      'tokens'
    );

    expect(files.map((file) => file.path)).toEqual([
      'tokens/Colors.tokens.json',
      'tokens/Spacing.tokens.json',
    ]);
    expect(JSON.parse(files[0].content)).toEqual({ Colors: tokens.Colors });
  });

  it('writes one file per mode inside a collection folder', () => {
    const files = splitTokensIntoFiles(byMode, { splitByMode: true }, 'tokens');

    expect(files.map((file) => file.path)).toEqual([
      'tokens/Colors/Light.tokens.json',
      'tokens/Colors/Dark.tokens.json',
    ]);
    expect(JSON.parse(files[0].content)).toEqual({
      Colors: byMode['Colors/Light'],
    });
  });

  it('strips a saved file name when splitting', () => {
    const files = splitTokensIntoFiles(
      tokens,
      { splitByCollection: true },
      'tokens/design.tokens.json'
    );

    expect(files[0].path).toBe('tokens/Colors.tokens.json');
  });

  it('keeps a dotted folder name that is not a json file', () => {
    const files = splitTokensIntoFiles(
      tokens,
      { splitByCollection: true },
      'packages/tokens.v2'
    );

    expect(files[0].path).toBe('packages/tokens.v2/Colors.tokens.json');
  });

  it('makes repository paths relative', () => {
    const files = splitTokensIntoFiles(
      tokens,
      { splitByCollection: true },
      '/tokens/design.tokens.json'
    );

    expect(files[0].path).toBe('tokens/Colors.tokens.json');
  });

  it('keeps a dotted folder name when the target is a folder', () => {
    const files = splitTokensIntoFiles(
      tokens,
      { splitByCollection: true, targetIsFolder: true },
      './out.v2'
    );

    expect(files[0].path).toBe('./out.v2/Colors.tokens.json');
  });

  it('keeps absolute paths and sanitizes names', () => {
    const files = splitTokensIntoFiles(
      { 'Colors/Brand': { red: { $value: '#f00' } } },
      { splitByCollection: true, targetIsFolder: true },
      '/tmp/tokens/'
    );

    expect(files[0].path).toBe('/tmp/tokens/Colors-Brand.tokens.json');
  });

  it('handles keys without a mode when splitting by mode', () => {
    const files = splitTokensIntoFiles(tokens, { splitByMode: true }, '');

    expect(files.map((file) => file.path)).toEqual([
      'Colors.tokens.json',
      'Spacing.tokens.json',
    ]);
  });
});
