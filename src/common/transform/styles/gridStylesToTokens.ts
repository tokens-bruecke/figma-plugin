import { groupObjectNamesIntoCategories } from '@common/transform/groupObjectNamesIntoCategories';
import { getTokenKeyName } from '@common/transform/getTokenKeyName';
import { makeDimension } from '@common/transform/makeDimension';
import { IResolver } from '@common/resolver';
import { warnSkippedStyle } from './warnSkippedStyle';

export const gridStylesToTokens = async (
  customName: string,
  isDTCGFormat: boolean,
  resolver: IResolver
) => {
  const keyNames = getTokenKeyName(isDTCGFormat);
  const gridStyles = await resolver.getLocalGridStyles();

  // console.log("gridStyles", gridStyles);

  let textTokens = {};

  const dimension = (value: number | undefined) =>
    value === undefined ? undefined : makeDimension(value, isDTCGFormat);

  // Figma writes an "Auto" count as Infinity, which JSON cannot hold
  const count = (value: number | undefined) =>
    Number.isFinite(value) ? value : undefined;

  const gridStyleToToken = (style: GridStyle) => {
    const grids = style.layoutGrids as LayoutGrid[];

    // Grids are picked by their pattern, not their position: a style can
    // have its rows first, or several grids of one kind. A square GRID only
    // has a cell size, exported as the column width when there are no columns.
    const columnGrid = (grids.find((grid) => grid.pattern === 'COLUMNS') ??
      grids.find((grid) => grid.pattern === 'GRID')) as
      | RowsColsLayoutGrid
      | undefined;
    const rowGrid = grids.find((grid) => grid.pattern === 'ROWS') as
      | RowsColsLayoutGrid
      | undefined;

    return {
      [keyNames.type]: 'grid',
      [keyNames.value]: {
        columnCount: count(columnGrid?.count),
        columnGap: dimension(columnGrid?.gutterSize),
        columnWidth: dimension(columnGrid?.sectionSize),
        columnMargin: dimension(columnGrid?.offset),
        rowCount: count(rowGrid?.count),
        rowGap: dimension(rowGrid?.gutterSize),
        rowHeight: dimension(rowGrid?.sectionSize),
        rowMargin: dimension(rowGrid?.offset),
      },
    } as unknown as GridTokenI;
  };

  const allGridStyles = gridStyles.reduce((result, style) => {
    try {
      result[style.name] = gridStyleToToken(style);
    } catch (error) {
      warnSkippedStyle(style.name, error);
    }

    return result;
  }, {});

  // console.log("allTextStyles", allTextStyles);

  textTokens[customName] = groupObjectNamesIntoCategories(allGridStyles);

  return textTokens;
};
