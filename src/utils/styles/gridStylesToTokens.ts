import { groupObjectNamesIntoCategories } from "../groupObjectNamesIntoCategories";
import { transformNameConvention } from "../transformNameConvention";

export const gridStylesToTokens = async (
  customName: string,
  nameConvention: nameConventionType
) => {
  let textTokens = {};

  const gridStylesName = transformNameConvention(customName, nameConvention);
  const gridStyles = figma.getLocalGridStyles();

  console.log("gridStyles", gridStyles);

  const allGridStyles = gridStyles.reduce((result, style) => {
    const styleName = style.name;
    const firstTwoGrids = style.layoutGrids.slice(0, 2) as RowsColsLayoutGrid[];

    const columnGrid = firstTwoGrids[0];
    const rowGrid = firstTwoGrids[1];

    const styleObject = {
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

  textTokens[gridStylesName] = groupObjectNamesIntoCategories(
    allGridStyles,
    nameConvention
  );

  return textTokens;
};
