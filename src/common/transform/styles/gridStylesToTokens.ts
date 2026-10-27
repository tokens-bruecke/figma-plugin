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

  const gridStyleToToken = (style: GridStyle) => {
    const firstTwoGrids = style.layoutGrids.slice(0, 2) as RowsColsLayoutGrid[];

    const columnGrid = firstTwoGrids[0];
    const rowGrid = firstTwoGrids[1];

    return {
      [keyNames.type]: 'grid',
      [keyNames.value]: {
        columnCount: columnGrid?.count,
        columnGap: columnGrid?.gutterSize
          ? makeDimension(columnGrid.gutterSize, isDTCGFormat)
          : undefined,
        columnWidth: columnGrid?.sectionSize
          ? makeDimension(columnGrid.sectionSize, isDTCGFormat)
          : undefined,
        columnMargin: columnGrid?.offset
          ? makeDimension(columnGrid.offset, isDTCGFormat)
          : undefined,
        rowCount: rowGrid?.count,
        rowGap: rowGrid?.gutterSize
          ? makeDimension(rowGrid.gutterSize, isDTCGFormat)
          : undefined,
        rowHeight: rowGrid?.sectionSize
          ? makeDimension(rowGrid.sectionSize, isDTCGFormat)
          : undefined,
        rowMargin: rowGrid?.offset
          ? makeDimension(rowGrid.offset, isDTCGFormat)
          : undefined,
      },
    } as unknown as GridTokenI;
  };

  const allGridStyles = gridStyles.reduce((result, style) => {
    try {
      result[style.name] = gridStyleToToken(style);
    } catch (error) {
      warnSkippedStyle(resolver, style.name, error);
    }

    return result;
  }, {});

  // console.log("allTextStyles", allTextStyles);

  textTokens[customName] = groupObjectNamesIntoCategories(allGridStyles);

  return textTokens;
};
