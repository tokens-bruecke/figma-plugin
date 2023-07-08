import { groupObjectNamesIntoCategories } from "./groupObjectNamesIntoCategories";
import { transformNameConvention } from "./transformNameConvention";

import { getLineHeight } from "./text/getLineHeight";
import { getLetterSpacing } from "./text/getLetterSpacing";
import { getFontWeight } from "./text/getFontWeight";

export const getAndConvertStyles = async (
  includedStyles: IncludedStylesI,
  nameConvention: nameConventionType
) => {
  const textStylesName = transformNameConvention(
    includedStyles.text.customName,
    nameConvention
  );
  const effectsStylesName = transformNameConvention(
    includedStyles.effects.customName,
    nameConvention
  );
  const gridsStylesName = transformNameConvention(
    includedStyles.grids.customName,
    nameConvention
  );

  const styleTokens = {
    [textStylesName]: {},
    [effectsStylesName]: {},
    [gridsStylesName]: {},
  };

  if (includedStyles.text.isIncluded) {
    const textStyles = figma.getLocalTextStyles();

    console.log("textStyles", textStyles);

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
        $type: "text",
        $description: style.description,
        $extensions: {
          styleId: style.id,
        },
      };

      result[styleName] = styleObject;

      return result;
    }, {});

    console.log("allTextStyles", allTextStyles);

    styleTokens[gridsStylesName] =
      groupObjectNamesIntoCategories(allTextStyles);
  }

  return styleTokens;
};

// #TODO: add support for multiple gradients in one style
