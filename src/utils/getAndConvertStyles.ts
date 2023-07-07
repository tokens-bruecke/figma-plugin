import { convertRGBA } from "./convertRGBA";
import { groupObjectNamesIntoCategories } from "./groupObjectNamesIntoCategories";

export const getAndConvertStyles = async (
  includedStyles: IncludedStylesI,
  colorMode: colorModeType
) => {
  const styleTokens = {
    [includedStyles.colors.customName]: {},
    [includedStyles.text.customName]: {},
    [includedStyles.effects.customName]: {},
    [includedStyles.grids.customName]: {},
  };

  if (includedStyles.colors.isIncluded) {
    const rawColorStyles = figma.getLocalPaintStyles();

    const reducedRawColorStyles = rawColorStyles.reduce((newObj, style) => {
      const paint = style.paints[0];
      const paintStyle = paint.type;
      const name = style.name;
      const description = style.description;

      if (paintStyle === "SOLID") {
        newObj[name] = {
          $type: "color",
          $value: convertRGBA(
            {
              ...paint.color,
              a: paint.opacity,
            },
            colorMode
          ),
          $description: description,
        };
      }

      return newObj;
    }, {});

    styleTokens[includedStyles.colors.customName] =
      groupObjectNamesIntoCategories(reducedRawColorStyles);
  }

  return styleTokens;
};
