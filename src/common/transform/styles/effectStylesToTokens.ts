import { groupObjectNamesIntoCategories } from '@common/transform/groupObjectNamesIntoCategories';
import { convertRGBA } from '@common/transform/color/convertRGBA';
import { getTokenKeyName } from '@common/transform/getTokenKeyName';
import { getAliasVariableName } from '@common/transform/getAliasVariableName';
import { makeDimension } from '@common/transform/makeDimension';
import { IResolver } from '@common/resolver';

const wrapShadowObject = async (
  shadowEffect: DropShadowEffect | InnerShadowEffect,
  colorMode: colorModeType,
  isDTCGFormat: boolean,
  includeValueStringKeyToAlias: boolean,
  resolver: IResolver
) => {
  const effectBoundVariables = shadowEffect.boundVariables;

  const getAlias = async (key: string) => {
    if (effectBoundVariables && effectBoundVariables[key]) {
      return await getAliasVariableName(
        effectBoundVariables[key].id,
        isDTCGFormat,
        includeValueStringKeyToAlias,
        resolver
      );
    }
    return null;
  };

  // console.log("shadowEffect", shadowEffect);
  return {
    inset: shadowEffect.type === 'INNER_SHADOW',
    color:
      (await getAlias('color')) || convertRGBA(shadowEffect.color, colorMode),
    offsetX:
      (await getAlias('offsetX')) ||
      makeDimension(shadowEffect.offset.x, isDTCGFormat),
    offsetY:
      (await getAlias('offsetY')) ||
      makeDimension(shadowEffect.offset.y, isDTCGFormat),
    blur:
      (await getAlias('blur')) ||
      makeDimension(shadowEffect.radius, isDTCGFormat),
    spread:
      (await getAlias('spread')) ||
      makeDimension(shadowEffect.spread, isDTCGFormat),
  };
};

export const effectStylesToTokens = async (
  customName: string,
  colorMode: colorModeType,
  isDTCGFormat: boolean,
  includeValueStringKeyToAlias: boolean,
  resolver: IResolver
) => {
  const keyNames = getTokenKeyName(isDTCGFormat);
  const effectStyles = await resolver.getLocalEffectStyles();

  let effectTokens = {};

  const allEffectStyles = {};

  for (const style of effectStyles) {
    const styleName = style.name;
    const effectType = style.effects[0].type;

    if (effectType === 'DROP_SHADOW' || effectType === 'INNER_SHADOW') {
      const styleObject = {
        [keyNames.type]: 'shadow',
        [keyNames.value]: await Promise.all(
          style.effects.map((effect) =>
            wrapShadowObject(
              effect as DropShadowEffect | InnerShadowEffect,
              colorMode,
              isDTCGFormat,
              includeValueStringKeyToAlias,
              resolver
            )
          )
        ),
      } as unknown as ShadowTokenI;
      allEffectStyles[styleName] = styleObject;
    }

    if (effectType === 'LAYER_BLUR' || effectType === 'BACKGROUND_BLUR') {
      const effect = style.effects[0];
      const aliasRef = effect.boundVariables?.radius;
      let aliasVariable: string | null = null;

      if (aliasRef) {
        aliasVariable = await getAliasVariableName(
          aliasRef.id,
          isDTCGFormat,
          includeValueStringKeyToAlias,
          resolver
        );
      }

      const styleObject = {
        $type: 'blur',
        $value: {
          role: effectType === 'LAYER_BLUR' ? 'layer' : 'background',
          blur: aliasVariable || makeDimension(effect.radius, isDTCGFormat),
        },
      } as BlurTokenI;
      allEffectStyles[styleName] = styleObject;
    }
  }

  // console.log("allEffectStyles", allEffectStyles);

  effectTokens[customName] = groupObjectNamesIntoCategories(allEffectStyles);

  return effectTokens;
};
