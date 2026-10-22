import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeStylesIntoTokens } from './mergeStylesIntoTokens';

const styleTokens = () => [{ 'Color-styles': { red: { $value: '#ff0000' } } }];

describe('mergeStylesIntoTokens', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('keeps the styles separate with "none"', () => {
    const tokens = mergeStylesIntoTokens({ Core: {} }, styleTokens(), 'none');

    expect(Object.keys(tokens)).toEqual(['Core', 'Color-styles']);
  });

  it('adds the styles to the chosen collection', () => {
    const tokens = mergeStylesIntoTokens({ Core: {} }, styleTokens(), 'Core');

    expect(tokens).toEqual({
      Core: { 'Color-styles': { red: { $value: '#ff0000' } } },
    });
  });

  it('keeps the styles separate when the collection does not exist', () => {
    const tokens = mergeStylesIntoTokens({ Core: {} }, styleTokens(), 'Other');

    expect(Object.keys(tokens)).toEqual(['Core', 'Color-styles']);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Collection "Other" to add the styles to')
    );
  });
});
