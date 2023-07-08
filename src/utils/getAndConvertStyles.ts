import { convertRGBA } from "./color/convertRGBA";
import { findByVariableId } from "./findByVariableId";
import { convertFigmaLinearGradient } from "./color/convertFigmaLinearGradient";
import { groupObjectNamesIntoCategories } from "./groupObjectNamesIntoCategories";

export const getAndConvertStyles = async (
  includedStyles: IncludedStylesI,
  colorMode: colorModeType,
  tokens: any
) => {
  const styleTokens = {
    [includedStyles.colors.customName]: {},
    [includedStyles.text.customName]: {},
    [includedStyles.effects.customName]: {},
    [includedStyles.grids.customName]: {},
  };

  if (includedStyles.colors.isIncluded) {
    const rawColorStyles = figma.getLocalPaintStyles() as PaintStyleExtended[];

    const reducedRawColorStyles = rawColorStyles.reduce((newObj, style) => {
      const paint = style.paints[0];
      const paintType = paint.type;
      const name = style.name;
      const description = style.description;

      // HANDLE ONLY SOLID COLORS
      if (paintType === "SOLID") {
        const isStyleIsAlias = style.boundVariables?.paints;
        // create partial token in order not to repeat the same code
        const partialToken = {
          $type: "color",
          $description: description,
          $extensions: {
            variableId: style.id,
          },
        } as ColorToken;

        if (isStyleIsAlias) {
          const aliasVariable = findByVariableId(
            tokens,
            style.boundVariables.paints[0].id
          ) as TokenI;

          newObj[name] = {
            ...partialToken,
            $value: aliasVariable.$extensions.aliasPath,
          };
        } else {
          const color = convertRGBA(
            {
              ...paint.color,
              a: paint.opacity,
            },
            colorMode
          );

          newObj[name] = {
            ...partialToken,
            $value: color,
          };
        }
      }

      // HANDLE LINEAR GRADIENTS
      if (paintType === "GRADIENT_LINEAR" || paintType === "GRADIENT_RADIAL") {
        console.log("paintStyle", paint);
        newObj[name] = {
          $type: "gradient",
          $description: description,
          $value: convertFigmaLinearGradient(paint),
        };
      }

      // if (paintType === "GRADIENT_RADIAL") {
      //   console.log("paintStyle", paint);
      // }

      return newObj;
    }, {});

    styleTokens[includedStyles.colors.customName] =
      groupObjectNamesIntoCategories(reducedRawColorStyles);
  }

  // if (includedStyles.effects.isIncluded) {
  //   const rawEffectStyles = figma.getLocalEffectStyles() as EffectStyle[];

  //   console.log("rawEffectStyles", rawEffectStyles);
  // }

  return styleTokens;
};

// #TODO: add support for multiple gradients in one style
