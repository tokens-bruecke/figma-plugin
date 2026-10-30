import { groupObjectNamesIntoCategories } from '@common/transform/groupObjectNamesIntoCategories';
import { ROOT_TOKEN_KEY } from '@common/transform/rootTokens';
import { convertRGBA } from '@common/transform/color/convertRGBA';
import { normalizeOpacity } from '@common/transform/color/composeColor';
import { getGradientGeometry } from '@common/transform/color/getGradientGeometry';
import { getTokenKeyName } from '@common/transform/getTokenKeyName';
import { getAliasVariableName } from '@common/transform/getAliasVariableName';
import { IResolver } from '@common/resolver';
import { warnSkippedStyle } from './warnSkippedStyle';
import { warn } from '@common/warn';
import Decimal from 'decimal.js';

const GRADIENT_TYPES: Paint['type'][] = [
  'GRADIENT_LINEAR',
  'GRADIENT_RADIAL',
  'GRADIENT_ANGULAR',
  'GRADIENT_DIAMOND',
];

const convertGradientStopsToDTCG = async (
  gradientStops: ReadonlyArray<ColorStop>,
  colorMode: colorModeType,
  isDTCGFormat: boolean,
  includeValueStringKeyToAlias: boolean,
  resolver: IResolver,
  omitCollectionNames = false
) => {
  const stops: { color: string | undefined; position: number }[] = [];

  for (let i = 0; i < gradientStops.length; i++) {
    const stop = gradientStops[i];
    let colorValue;

    // Each gradient stop can have its own bound variable for the color
    const stopBoundVariable = (stop as any).boundVariables?.color;

    if (stopBoundVariable?.id) {
      colorValue = await getAliasVariableName(
        stopBoundVariable.id,
        isDTCGFormat,
        includeValueStringKeyToAlias,
        resolver,
        omitCollectionNames
      );
    } else {
      const colorWithOpacity = {
        r: stop.color.r,
        g: stop.color.g,
        b: stop.color.b,
        a: stop.color.a,
      };
      colorValue = convertRGBA(colorWithOpacity, colorMode);
    }

    stops.push({
      color: colorValue,
      position: stop.position,
    });
  }

  return stops;
};

export const colorStylesToTokens = async (
  customName: string,
  colorMode: colorModeType,
  isDTCGFormat: boolean,
  includeValueStringKeyToAlias: boolean,
  resolver: IResolver,
  omitCollectionNames = false,
  usePercentageOpacity = false,
  includeFigmaMetaData = false
) => {
  const keyNames = getTokenKeyName(isDTCGFormat);
  const paintStyles = await resolver.getLocalPaintStyles();

  let colorTokens = {};

  const allColorStyles = {};

  for (const style of paintStyles) {
    try {
      allColorStyles[style.name] = await paintStyleToToken(style);
    } catch (error) {
      warnSkippedStyle(resolver, style.name, error);
    }
  }

  async function paintStyleToToken(style: PaintStyle) {
    const paints = style.paints;

    if (paints.length === 0) {
      throw new Error('it has no paints');
    }

    // Figma lists paints from bottom to top, so the last visible paint is the
    // one on top. A token has one value, so that paint gives it.
    const visiblePaints = paints.filter((paint) => paint.visible !== false);
    const paint = [...(visiblePaints.length > 0 ? visiblePaints : paints)]
      .reverse()
      .find(
        (paint) => paint.type === 'SOLID' || GRADIENT_TYPES.includes(paint.type)
      );

    if (!paint) {
      throw new Error(
        `only a solid paint or a gradient can be exported, it has ${paints
          .map((paint) => paint.type)
          .join(', ')}`
      );
    }

    const leftOut = visiblePaints.filter((other) => other !== paint).length;

    if (leftOut > 0 && !includeFigmaMetaData) {
      warn(
        resolver,
        `[tokens-bruecke] Style "${style.name}": exported its top paint and left out ${leftOut} other paint(s). Turn on "Include Figma metadata" to get all of them in $extensions.figma.paints.`
      );
    }

    const token =
      paint.type === 'SOLID'
        ? await solidPaintToToken(style, paint)
        : await gradientPaintToToken(paint as GradientPaint);

    if (!includeFigmaMetaData) {
      return token;
    }

    const paintsMetadata = [];

    for (const paint of paints) {
      paintsMetadata.push(await paintToMetadata(style, paint));
    }

    return {
      ...token,
      $extensions: {
        ...token.$extensions,
        figma: { styleId: style.id, paints: paintsMetadata },
      },
    };
  }

  // The plugin API binds the variable of a single paint on the style, the
  // paints of a stack each carry their own
  function aliasIdOf(style: PaintStyle, paint: Paint): string | undefined {
    return (
      (paint as any).boundVariables?.color?.id ??
      (style.paints.length === 1
        ? (style as any).boundVariables?.paints?.[0]?.id
        : undefined)
    );
  }

  async function aliasOf(style: PaintStyle, paint: Paint) {
    const aliasId = aliasIdOf(style, paint);

    return aliasId
      ? await getAliasVariableName(
          aliasId,
          isDTCGFormat,
          includeValueStringKeyToAlias,
          resolver,
          omitCollectionNames
        )
      : null;
  }

  async function solidPaintToToken(
    style: PaintStyle,
    paint: SolidPaint
  ): Promise<Record<string, any>> {
    const aliasVariable = await aliasOf(style, paint);

    const colorWithOpacity = {
      r: paint.color.r,
      g: paint.color.g,
      b: paint.color.b,
      a: paint.opacity !== undefined ? paint.opacity : 1,
    };

    // The paint's own opacity applies on top of the bound color variable,
    // so keep both, in the shape of a color alias with opacity
    if (aliasVariable && colorWithOpacity.a < 1) {
      return {
        [keyNames.type]: 'color',
        [keyNames.value]: {
          components: aliasVariable,
          alpha: normalizeOpacity(
            new Decimal(colorWithOpacity.a)
              .times(100)
              .toDecimalPlaces(4)
              .toNumber(),
            usePercentageOpacity
          ),
        },
      };
    }

    return {
      [keyNames.type]: 'color',
      [keyNames.value]:
        aliasVariable || convertRGBA(colorWithOpacity, colorMode),
    };
  }

  async function gradientPaintToToken(
    paint: GradientPaint
  ): Promise<Record<string, any>> {
    const gradientStops = await convertGradientStopsToDTCG(
      paint.gradientStops,
      colorMode,
      isDTCGFormat,
      includeValueStringKeyToAlias,
      resolver,
      omitCollectionNames
    );

    // DTCG has no direction or type for a gradient, only stops
    const geometry = getGradientGeometry(paint);

    return {
      [keyNames.type]: 'gradient',
      [keyNames.value]: gradientStops,
      ...(geometry && { $extensions: { gradient: geometry } }),
    };
  }

  // Every paint of the style as it is in Figma, for code that needs the
  // whole stack rather than the single value of the token
  async function paintToMetadata(style: PaintStyle, paint: Paint) {
    const common = {
      type: paint.type,
      visible: paint.visible !== false,
      opacity: paint.opacity ?? 1,
      blendMode: paint.blendMode ?? 'NORMAL',
    };

    if (paint.type === 'SOLID') {
      return {
        ...common,
        color:
          (await aliasOf(style, paint)) ||
          convertRGBA({ ...paint.color, a: 1 }, colorMode),
      };
    }

    if (GRADIENT_TYPES.includes(paint.type)) {
      const gradient = paint as GradientPaint;
      const geometry = getGradientGeometry(gradient);

      return {
        ...common,
        stops: await convertGradientStopsToDTCG(
          gradient.gradientStops,
          colorMode,
          isDTCGFormat,
          includeValueStringKeyToAlias,
          resolver,
          omitCollectionNames
        ),
        ...(geometry && { gradient: geometry }),
        ...(gradient.gradientTransform && {
          gradientTransform: gradient.gradientTransform,
        }),
      };
    }

    if (paint.type === 'IMAGE') {
      return {
        ...common,
        imageHash: paint.imageHash,
        scaleMode: paint.scaleMode,
      };
    }

    return common;
  }

  colorTokens[customName] = groupObjectNamesIntoCategories(
    allColorStyles,
    isDTCGFormat ? ROOT_TOKEN_KEY : undefined
  );

  return colorTokens;
};
