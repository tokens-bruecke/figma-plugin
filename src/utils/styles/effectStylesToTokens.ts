import { groupObjectNamesIntoCategories } from "../groupObjectNamesIntoCategories";
import { convertRGBA } from "../color/convertRGBA";
import { getTokenKeyName } from "../getTokenKeyName";

const wrapShadowObject = (
  shadowEffect: DropShadowEffect | InnerShadowEffect,
  colorMode: colorModeType
) => {
  return {
    inset: shadowEffect.type === "INNER_SHADOW",
    color: convertRGBA(shadowEffect.color, colorMode),
    offsetX: `${shadowEffect.offset.x}px`,
    offsetY: `${shadowEffect.offset.y}px`,
    blur: `${shadowEffect.radius}px`,
    spread: `${shadowEffect.spread}px`,
  };
};

export const effectStylesToTokens = async (
  customName: string,
  colorMode: colorModeType,
  isDTCGForamt: boolean
) => {
  const keyNames = getTokenKeyName(isDTCGForamt);
  const effectStyles = figma.getLocalEffectStyles();

  console.log("effectStyles length", effectStyles.length);

  let effectTokens = {};

  const allEffectStyles = effectStyles.reduce((result, style) => {
    const styleName = style.name;
    const effectType = style.effects[0].type;

    console.log(styleName, style.effects);

    if (effectType === "DROP_SHADOW" || effectType === "INNER_SHADOW") {
      const styleObject = {
        [keyNames.type]: "shadow",
        [keyNames.value]:
          style.effects.length === 1
            ? wrapShadowObject(style.effects[0], colorMode)
            : style.effects.map((effect) =>
                wrapShadowObject(
                  effect as DropShadowEffect | InnerShadowEffect,
                  colorMode
                )
              ),
      } as unknown as ShadowTokenI;
      result[styleName] = styleObject;
    }

    if (effectType === "LAYER_BLUR" || effectType === "BACKGROUND_BLUR") {
      const effect = style.effects[0];
      const styleObject = {
        $type: "blur",
        $value: {
          role: effectType === "LAYER_BLUR" ? "layer" : "background",
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
