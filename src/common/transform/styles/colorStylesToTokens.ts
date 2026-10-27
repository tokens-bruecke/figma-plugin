import { groupObjectNamesIntoCategories } from '@common/transform/groupObjectNamesIntoCategories';
import { ROOT_TOKEN_KEY } from '@common/transform/rootTokens';
import { convertRGBA } from '@common/transform/color/convertRGBA';
import { normalizeOpacity } from '@common/transform/color/composeColor';
import { getGradientGeometry } from '@common/transform/color/getGradientGeometry';
import { getTokenKeyName } from '@common/transform/getTokenKeyName';
import { getAliasVariableName } from '@common/transform/getAliasVariableName';
import { IResolver } from '@common/resolver';
import { warnSkippedStyle } from './warnSkippedStyle';
import Decimal from 'decimal.js';

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
  usePercentageOpacity = false
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

    const boundVariables = (style as any).boundVariables;

    // Handle solid color paints
    if (paints.length === 1 && paints[0].type === 'SOLID') {
      const paint = paints[0] as SolidPaint;

      // Check for bound variables (aliases)
      let aliasVariable: string | null = null;

      if (boundVariables?.paints && boundVariables.paints.length > 0) {
        aliasVariable = await getAliasVariableName(
          boundVariables.paints[0].id,
          isDTCGFormat,
          includeValueStringKeyToAlias,
          resolver,
          omitCollectionNames
        );
      }

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

    // Handle gradient paints (LINEAR, RADIAL, ANGULAR, DIAMOND)
    if (
      paints[0].type === 'GRADIENT_LINEAR' ||
      paints[0].type === 'GRADIENT_RADIAL' ||
      paints[0].type === 'GRADIENT_ANGULAR' ||
      paints[0].type === 'GRADIENT_DIAMOND'
    ) {
      const paint = paints[0] as GradientPaint;

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

    throw new Error(
      `only a single solid paint or a gradient can be exported, it has ${paints
        .map((paint) => paint.type)
        .join(', ')}`
    );
  }

  colorTokens[customName] = groupObjectNamesIntoCategories(
    allColorStyles,
    isDTCGFormat ? ROOT_TOKEN_KEY : undefined
  );

  return colorTokens;
};
