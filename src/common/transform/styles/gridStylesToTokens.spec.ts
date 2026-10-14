import { describe, it, expect } from 'vitest';
import { gridStylesToTokens } from './gridStylesToTokens';

const exportGrid = async (layoutGrids: any[]) => {
  const resolver = {
    getLocalGridStyles: async () => [{ id: '1:2', name: 'grid', layoutGrids }],
  } as any;

  const tokens: any = await gridStylesToTokens('grids', true, resolver);

  // Serialized like the plugin UI and the CLI do.
  return JSON.parse(JSON.stringify(tokens.grids.grid.$value));
};

describe('gridStylesToTokens', () => {
  it('exports a GRID pattern without a count', async () => {
    const value = await exportGrid([{ pattern: 'GRID', sectionSize: 8 }]);

    expect(value).toEqual({ columnWidth: { value: 8, unit: 'px' } });
  });

  it('exports the columns and rows of the first two grids', async () => {
    const value = await exportGrid([
      {
        pattern: 'COLUMNS',
        alignment: 'STRETCH',
        gutterSize: 16,
        offset: 24,
        count: 12,
      },
      {
        pattern: 'ROWS',
        alignment: 'MIN',
        gutterSize: 8,
        sectionSize: 40,
        offset: 0,
        count: 4,
      },
    ]);

    expect(value).toEqual({
      columnCount: 12,
      columnGap: { value: 16, unit: 'px' },
      columnMargin: { value: 24, unit: 'px' },
      rowCount: 4,
      rowGap: { value: 8, unit: 'px' },
      rowHeight: { value: 40, unit: 'px' },
    });
  });
});
