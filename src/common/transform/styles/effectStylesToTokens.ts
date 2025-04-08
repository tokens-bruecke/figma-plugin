import { groupObjectNamesIntoCategories } from "../groupObjectNamesIntoCategories";
import { convertRGBA } from "../color/convertRGBA";
import { getTokenKeyName } from "../getTokenKeyName";
import { getAliasVariableName } from "../getAliasVariableName";
import { IResolver } from "../../resolver";

const wrapShadowObject = (
  shadowEffect: DropShadowEffect | InnerShadowEffect,
  colorMode: colorModeType,
  isDTCGForamt: boolean,
  includeValueAliasString: boolean,
  resolver: IResolver
) => {
  const effectBoundVariables = shadowEffect.boundVariables;

  const getAlias = (key: string) => {
    if (effectBoundVariables && effectBoundVariables[key]) {
      return getAliasVariableName(
        effectBoundVariables[key].id,
        isDTCGForamt,
        includeValueAliasString,
        resolver
      );
    }
    return null;
  };

  // console.log("shadowEffect", shadowEffect);
  return {
    inset: shadowEffect.type === "INNER_SHADOW",
    color: convertRGBA(shadowEffect.color, colorMode),
    offsetX: getAlias("offsetX") || `${shadowEffect.offset.x}px`,
    offsetY: getAlias("offsetY") || `${shadowEffect.offset.y}px`,
    blur: getAlias("blur") || `${shadowEffect.radius}px`,
    spread: getAlias("spread") || `${shadowEffect.spread}px`,
  };
};

export const effectStylesToTokens = async (
  customName: string,
  colorMode: colorModeType,
  isDTCGForamt: boolean,
  includeValueAliasString: boolean,
  resolver: IResolver
) => {
  const keyNames = getTokenKeyName(isDTCGForamt);
  const effectStyles = await resolver.getLocalEffectStyles();

  // console.log("effectStyles", effectStyles);

  let effectTokens = {};

  const allEffectStyles = effectStyles.reduce((result, style) => {
    const styleName = style.name;
    const effectType = style.effects[0].type;

    if (effectType === "DROP_SHADOW" || effectType === "INNER_SHADOW") {
      const styleObject = {
        [keyNames.type]: "shadow",
        [keyNames.value]: style.effects.map((effect) =>
          wrapShadowObject(
            effect as DropShadowEffect | InnerShadowEffect,
            colorMode,
            isDTCGForamt,
            includeValueAliasString,
            resolver
          )
        ),
      } as unknown as ShadowTokenI;
      result[styleName] = styleObject;
    }

    if (effectType === "LAYER_BLUR" || effectType === "BACKGROUND_BLUR") {
      const effect = style.effects[0];
      const aliasRef = effect.boundVariables?.radius;
      let aliasVariable = null;

      if (aliasRef) {
        aliasVariable = getAliasVariableName(
          aliasRef.id,
          isDTCGForamt,
          includeValueAliasString,
          resolver
        );
      }

      const styleObject = {
        $type: "blur",
        $value: {
          role: effectType === "LAYER_BLUR" ? "layer" : "background",
          blur: aliasVariable || `${effect.radius}px`,
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
