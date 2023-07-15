import { groupObjectNamesIntoCategories } from "../groupObjectNamesIntoCategories";
import { convertRGBA } from "../color/convertRGBA";

export const effectStylesToTokens = async (
  customName: string,
  colorMode: colorModeType
) => {
  let effectTokens = {};

  const effectStyles = figma.getLocalEffectStyles();

  console.log("effectStyles length", effectStyles.length);

  const allEffectStyles = effectStyles.reduce((result, style) => {
    const styleName = style.name;
    const effect = style.effects[0];

    if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
      const styleObject = {
        $type: "shadow",
        $value: {
          inset: effect.type === "INNER_SHADOW",
          color: convertRGBA(effect.color, colorMode),
          offsetX: `${effect.offset.x}px`,
          offsetY: `${effect.offset.y}px`,
          blur: `${effect.radius}px`,
          spread: `${effect.spread}px`,
        },
      } as ShadowTokenI;

      result[styleName] = styleObject;
    }

    if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
      const styleObject = {
        $type: "blur",
        $value: {
          role: effect.type === "LAYER_BLUR" ? "layer" : "background",
          blur: `${effect.radius}px`,
        },
      } as BlurTokenI;

      result[styleName] = styleObject;
    }

    return result;
  }, {});

  // console.log("allEffectStyles", allEffectStyles);

  effectTokens[customName] = groupObjectNamesIntoCategories(allEffectStyles);

  return effectTokens;
};
