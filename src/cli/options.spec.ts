import { describe, it, expect } from 'vitest';
import { defaultConfig } from './defaults';
import { getStdoutSplitConflict, resolveExportOptions } from './options';

describe('resolveExportOptions', () => {
  it('uses the defaults without a config file or flags', () => {
    expect(resolveExportOptions({}, {})).toEqual(defaultConfig);
  });

  it('merges each included style type with its default', () => {
    const options = resolveExportOptions(
      { includedStyles: { text: { isIncluded: true } } },
      {}
    );
    expect(options.includedStyles).toEqual({
      ...defaultConfig.includedStyles,
      text: { isIncluded: true, customName: 'Typography-styles' },
    });
  });

  it('keeps a custom name from the config file', () => {
    const options = resolveExportOptions(
      {
        includedStyles: {
          effects: { isIncluded: true, customName: 'shadows' },
        },
      },
      {}
    );
    expect(options.includedStyles.effects).toEqual({
      isIncluded: true,
      customName: 'shadows',
    });
    expect(options.includedStyles.text).toEqual(
      defaultConfig.includedStyles.text
    );
  });

  it('does not change the shared defaults', () => {
    resolveExportOptions(
      { includedStyles: { grids: { isIncluded: true } } },
      {}
    );
    expect(defaultConfig.includedStyles.grids.isIncluded).toBe(false);
  });

  it('lets flags override the config file', () => {
    const options = resolveExportOptions(
      {
        splitByCollection: false,
        splitByMode: true,
        omitCollectionNames: true,
      },
      { splitByCollection: true, splitByMode: false }
    );
    expect(options.splitByCollection).toBe(true);
    expect(options.splitByMode).toBe(false);
    expect(options.omitCollectionNames).toBe(true);
  });

  it('reads omitCreatedAt from the config file, and the flag overrides it', () => {
    expect(resolveExportOptions({}, {}).omitCreatedAt).toBe(false);
    expect(resolveExportOptions({ omitCreatedAt: true }, {}).omitCreatedAt).toBe(
      true
    );
    expect(
      resolveExportOptions({ omitCreatedAt: true }, { omitCreatedAt: false })
        .omitCreatedAt
    ).toBe(false);
  });

  it('reads the legacy useDTCGKeys option', () => {
    expect(resolveExportOptions({ useDTCGKeys: false }, {}).useDTCG).toBe(
      false
    );
  });
});

describe('getStdoutSplitConflict', () => {
  it('allows --stdout without splits', () => {
    expect(getStdoutSplitConflict(defaultConfig)).toBeNull();
  });

  it('rejects a split set in the config file', () => {
    const options = resolveExportOptions({ splitByMode: true }, {});
    expect(getStdoutSplitConflict(options)).toMatch(
      /^--stdout cannot be combined with splitByMode/
    );
  });

  it('names both splits when both are on', () => {
    expect(
      getStdoutSplitConflict({ splitByCollection: true, splitByMode: true })
    ).toMatch(/splitByCollection \/ splitByMode/);
  });
});
