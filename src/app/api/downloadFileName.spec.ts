import { describe, expect, it } from 'vitest';
import { getDownloadFileNames } from './downloadFileName';

describe('getDownloadFileNames', () => {
  it('keeps the design.tokens names when no name is set', () => {
    expect(getDownloadFileNames()).toEqual({
      json: 'design.tokens.json',
      zip: 'design.tokens.zip',
    });
    expect(getDownloadFileNames('   ')).toEqual(getDownloadFileNames());
  });

  it('adds the extension when it is left out', () => {
    expect(getDownloadFileNames('brand')).toEqual({
      json: 'brand.json',
      zip: 'brand.zip',
    });
  });

  it('does not double the extension', () => {
    expect(getDownloadFileNames('brand-a.tokens.json')).toEqual({
      json: 'brand-a.tokens.json',
      zip: 'brand-a.tokens.zip',
    });
    expect(getDownloadFileNames('Theme.JSON').json).toBe('Theme.json');
    expect(getDownloadFileNames('brand.zip').zip).toBe('brand.zip');
  });

  it('replaces characters that are illegal in file names', () => {
    expect(getDownloadFileNames('tokens/brand: a').json).toBe(
      'tokens-brand- a.json'
    );
  });

  it('drops trailing dots and spaces', () => {
    expect(getDownloadFileNames(' brand. ').json).toBe('brand.json');
    expect(getDownloadFileNames('.json').json).toBe('design.tokens.json');
  });
});
