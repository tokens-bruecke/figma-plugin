import { groupObjectNamesIntoCategories } from "../groupObjectNamesIntoCategories";

import { getLineHeight } from "../text/getLineHeight";
import { getLetterSpacing } from "../text/getLetterSpacing";
import { getFontWeight } from "../text/getFontWeight";

export const textStylesToTokens = async (customName: string) => {
  let textTokens = {};

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

  textTokens[customName] = groupObjectNamesIntoCategories(allTextStyles);

  return textTokens;
};
