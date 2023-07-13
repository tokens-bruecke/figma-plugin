import { groupObjectNamesIntoCategories } from "../groupObjectNamesIntoCategories";

export const gridStylesToTokens = async (customName: string) => {
  let textTokens = {};

  const gridStyles = figma.getLocalGridStyles();

  console.log("gridStyles", gridStyles);

  const allGridStyles = gridStyles.reduce((result, style) => {
    const styleName = style.name;
    const firstTwoGrids = style.layoutGrids.slice(0, 2) as RowsColsLayoutGrid[];

    const columnGrid = firstTwoGrids[0];
    const rowGrid = firstTwoGrids[1];

    const styleObject = {
      $type: "grid",
      $value: {
        columnCount: columnGrid?.count,
        columnGap: columnGrid?.gutterSize,
        columnWidth: columnGrid?.sectionSize,
        columnMargin: columnGrid?.offset,
        rowCount: rowGrid?.count,
        rowGap: rowGrid?.gutterSize,
        rowHeight: rowGrid?.sectionSize,
        rowMargin: rowGrid?.offset,
      },
    } as GridTokenI;

    result[styleName] = styleObject;

    return result;
  }, {});

  // console.log("allTextStyles", allTextStyles);

  textTokens[customName] = groupObjectNamesIntoCategories(allGridStyles);

  return textTokens;
};
