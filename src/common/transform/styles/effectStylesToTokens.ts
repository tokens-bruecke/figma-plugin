import { groupObjectNamesIntoCategories } from '@common/transform/groupObjectNamesIntoCategories';
import { convertRGBA } from '@common/transform/color/convertRGBA';
import { getTokenKeyName } from '@common/transform/getTokenKeyName';
import { getAliasVariableName } from '@common/transform/getAliasVariableName';
import { makeDimension } from '@common/transform/makeDimension';
import { IResolver } from '@common/resolver';
import { warnSkippedStyle } from './warnSkippedStyle';
import { warn } from '@common/warn';

const SHADOW_TYPES: Effect['type'][] = ['DROP_SHADOW', 'INNER_SHADOW'];
const BLUR_TYPES: Effect['type'][] = ['LAYER_BLUR', 'BACKGROUND_BLUR'];

const wrapShadowObject = async (
  shadowEffect: DropShadowEffect | InnerShadowEffect,
  colorMode: colorModeType,
  isDTCGFormat: boolean,
  includeValueStringKeyToAlias: boolean,
  resolver: IResolver,
  omitCollectionNames = false
) => {
  const effectBoundVariables = shadowEffect.boundVariables;

  const getAlias = async (key: string) => {
    if (effectBoundVariables && effectBoundVariables[key]) {
      return await getAliasVariableName(
        effectBoundVariables[key].id,
        isDTCGFormat,
        includeValueStringKeyToAlias,
        resolver,
        omitCollectionNames
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
    // Figma binds the shadow's blur as `radius`, like the field it sets
    blur:
      (await getAlias('radius')) ||
      makeDimension(shadowEffect.radius, isDTCGFormat),
    // The REST API leaves out a spread of 0
    spread:
      (await getAlias('spread')) ||
      makeDimension(shadowEffect.spread ?? 0, isDTCGFormat),
  };
};

export const effectStylesToTokens = async (
  customName: string,
  colorMode: colorModeType,
  isDTCGFormat: boolean,
  includeValueStringKeyToAlias: boolean,
  resolver: IResolver,
  omitCollectionNames = false
) => {
  const keyNames = getTokenKeyName(isDTCGFormat);
  const effectStyles = await resolver.getLocalEffectStyles();

  let effectTokens = {};

  const allEffectStyles = {};

  for (const style of effectStyles) {
    try {
      allEffectStyles[style.name] = await effectStyleToToken(style);
    } catch (error) {
      warnSkippedStyle(resolver, style.name, error);
    }
  }

  async function effectStyleToToken(style: EffectStyle) {
    const [firstEffect] = style.effects;

    if (!firstEffect) {
      throw new Error('it has no effects');
    }

    // The first effect decides the token type. A style can stack effects of
    // different kinds (e.g. a drop shadow and a layer blur), but a token has
    // one type, so the effects of the other kind are left out.
    const effectTypes = SHADOW_TYPES.includes(firstEffect.type)
      ? SHADOW_TYPES
      : BLUR_TYPES.includes(firstEffect.type)
      ? BLUR_TYPES
      : null;

    if (!effectTypes) {
      throw new Error(`unsupported effect type ${firstEffect.type}`);
    }

    const effects = style.effects.filter((effect) =>
      effectTypes.includes(effect.type)
    );
    const leftOut = style.effects.length - effects.length;

    if (leftOut > 0) {
      warn(
        resolver,
        `[tokens-bruecke] Style "${
          style.name
        }": left out ${leftOut} effect(s) that are not a ${
          effectTypes === SHADOW_TYPES ? 'shadow' : 'blur'
        }, like its first effect.`
      );
    }

    if (effectTypes === SHADOW_TYPES) {
      return {
        [keyNames.type]: 'shadow',
        [keyNames.value]: await Promise.all(
          effects.map((effect) =>
            wrapShadowObject(
              effect as DropShadowEffect | InnerShadowEffect,
              colorMode,
              isDTCGFormat,
              includeValueStringKeyToAlias,
              resolver,
              omitCollectionNames
            )
          )
        ),
      } as unknown as ShadowTokenI;
    }

    // Only the first blur is exported
    const blurEffect = firstEffect as BlurEffect;
    const aliasRef = blurEffect.boundVariables?.radius;
    let aliasVariable: string | null = null;

    if (aliasRef) {
      aliasVariable = await getAliasVariableName(
        aliasRef.id,
        isDTCGFormat,
        includeValueStringKeyToAlias,
        resolver,
        omitCollectionNames
      );
    }

    return {
      $type: 'blur',
      $value: {
        role: blurEffect.type === 'LAYER_BLUR' ? 'layer' : 'background',
        blur: aliasVariable || makeDimension(blurEffect.radius, isDTCGFormat),
      },
    } as BlurTokenI;
  }

  // console.log("allEffectStyles", allEffectStyles);

  effectTokens[customName] = groupObjectNamesIntoCategories(allEffectStyles);

  return effectTokens;
};
