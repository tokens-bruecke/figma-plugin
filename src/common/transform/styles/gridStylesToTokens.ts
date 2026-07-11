import { groupObjectNamesIntoCategories } from '@common/transform/groupObjectNamesIntoCategories';
import { getTokenKeyName } from '@common/transform/getTokenKeyName';
import { makeDimension } from '@common/transform/makeDimension';
import { IResolver } from '@common/resolver';

export const gridStylesToTokens = async (
  customName: string,
  isDTCGForamt: boolean,
  resolver: IResolver
) => {
  const keyNames = getTokenKeyName(isDTCGForamt);
  const gridStyles = await resolver.getLocalGridStyles();

  // console.log("gridStyles", gridStyles);

  let textTokens = {};

  const allGridStyles = gridStyles.reduce((result, style) => {
    const styleName = style.name;
    const firstTwoGrids = style.layoutGrids.slice(0, 2) as RowsColsLayoutGrid[];

    const columnGrid = firstTwoGrids[0];
    const rowGrid = firstTwoGrids[1];

    const styleObject = {
      [keyNames.type]: 'grid',
      [keyNames.value]: {
        columnCount: columnGrid?.count,
        columnGap: columnGrid?.gutterSize
          ? makeDimension(columnGrid.gutterSize, isDTCGForamt)
          : undefined,
        columnWidth: columnGrid?.sectionSize
          ? makeDimension(columnGrid.sectionSize, isDTCGForamt)
          : undefined,
        columnMargin: columnGrid?.offset
          ? makeDimension(columnGrid.offset, isDTCGForamt)
          : undefined,
        rowCount: rowGrid?.count,
        rowGap: rowGrid?.gutterSize
          ? makeDimension(rowGrid.gutterSize, isDTCGForamt)
          : undefined,
        rowHeight: rowGrid?.sectionSize
          ? makeDimension(rowGrid.sectionSize, isDTCGForamt)
          : undefined,
        rowMargin: rowGrid?.offset
          ? makeDimension(rowGrid.offset, isDTCGForamt)
          : undefined,
      },
    } as unknown as GridTokenI;

    result[styleName] = styleObject;

    return result;
  }, {});

  // console.log("allTextStyles", allTextStyles);

  textTokens[customName] = groupObjectNamesIntoCategories(allGridStyles);

  return textTokens;
};
