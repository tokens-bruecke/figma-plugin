import { convertRGBA } from "../color/convertRGBA";
import { findByVariableId } from "../findByVariableId";
import { convertFigmaLinearGradient } from "../color/convertFigmaLinearGradient";
import { groupObjectNamesIntoCategories } from "../groupObjectNamesIntoCategories";

export const colorStylesToTokens = async (
  customName: string,
  colorMode: colorModeType,
  tokens: any
) => {
  let colorStyles = {};

  const rawColorStyles = figma.getLocalPaintStyles() as PaintStyleExtended[];

  // console.log("rawColorStyles length", rawColorStyles);

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
      } as ColorTokenI;

      if (isStyleIsAlias) {
        const aliasVariable = findByVariableId(
          tokens,
          style.boundVariables.paints[0].id
        ) as PluginTokenI;

        // console.log("aliasVariable", aliasVariable);

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
      // console.log("paintStyle", paint);
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

  console.log("reducedRawColorStyles", reducedRawColorStyles);

  colorStyles[customName] = groupObjectNamesIntoCategories(
    reducedRawColorStyles
  );

  return colorStyles;
};

// #TODO: add support for multiple gradients in one style
