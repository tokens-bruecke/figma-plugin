import { groupObjectNamesIntoCategories } from "../groupObjectNamesIntoCategories";
import { transformNameConvention } from "../transformNameConvention";

import { getLineHeight } from "../text/getLineHeight";
import { getLetterSpacing } from "../text/getLetterSpacing";
import { getFontWeight } from "../text/getFontWeight";

export const textStylesToTokens = async (
  customName: string,
  nameConvention: nameConventionType
) => {
  let textTokens = {};

  const textStylesName = transformNameConvention(customName, nameConvention);
  const textStyles = figma.getLocalTextStyles();

  // console.log("textStyles", textStyles);

  const allTextStyles = textStyles.reduce((result, style) => {
    const styleName = style.name;

    const styleObject = {
      $value: {
        fontFamily: style.fontName.family,
        fontWeight: getFontWeight(style.fontName.style),
        fontSize: `${style.fontSize}px`,
        lineHeight: getLineHeight(style.lineHeight),
        letterSpacing: getLetterSpacing(style.letterSpacing),
      },
      $type: "typography",
      $description: style.description,
      $extensions: {
        styleId: style.id,
      },
    } as TypographyTokenI;

    result[styleName] = styleObject;

    return result;
  }, {});

  // console.log("allTextStyles", allTextStyles);

  textTokens[textStylesName] = groupObjectNamesIntoCategories(
    allTextStyles,
    nameConvention
  );

  return textTokens;
};
