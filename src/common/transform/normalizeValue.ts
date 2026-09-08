import Decimal from 'decimal.js';
import { IResolver } from '@common/resolver';
import { convertRGBA } from './color/convertRGBA';
import { isComposedColor, normalizeComposedColor } from './color/composeColor';
import { isOpacityScope } from './opacityScopes';
import { getAliasVariableName } from './getAliasVariableName';
import { makeDimension } from './makeDimension';
import { makeDuration, normalizeEasing } from './motion';

interface PropsI {
  variableValue: any;
  variableType: VariableResolvedDataType;
  variableScope: VariableScope[];
  colorMode: colorModeType;
  useDTCG: boolean;
  includeValueStringKeyToAlias: boolean;
  usePercentageOpacity: boolean;
  omitCollectionNames?: boolean;
  expandEasingPresets?: boolean;
}

export const normalizeValue = async (props: PropsI, resolver: IResolver) => {
  const {
    variableValue,
    variableType,
    variableScope,
    colorMode,
    useDTCG,
    includeValueStringKeyToAlias,
    usePercentageOpacity,
    omitCollectionNames = false,
    expandEasingPresets = true,
  } = props;

  // console.log("variableValue", variableValue);

  if (variableValue?.type === 'VARIABLE_ALIAS') {
    // console.log("VARIABLE_ALIAS", variableValue);

    const aliasVariableName = await getAliasVariableName(
      variableValue.id,
      useDTCG,
      includeValueStringKeyToAlias,
      resolver,
      omitCollectionNames
    );

    return aliasVariableName;
  }

  if (isComposedColor(variableValue)) {
    // Color alias with its own opacity (Figma "Control opacity at scale")
    return normalizeComposedColor({
      value: variableValue,
      colorMode,
      usePercentageOpacity,
      resolveAlias: (id) =>
        getAliasVariableName(
          id,
          useDTCG,
          includeValueStringKeyToAlias,
          resolver,
          omitCollectionNames
        ),
    });
  }

  if (variableType === 'COLOR') {
    return convertRGBA(variableValue, colorMode);
  }

  if (variableType === 'FLOAT') {
    if (variableScope.length === 1 && variableScope[0] === 'FONT_WEIGHT') {
      return Number(variableValue);
    } else if (isOpacityScope(variableScope)) {
      if (usePercentageOpacity) {
        return `${variableValue}%`;
      } else {
        return Number(variableValue) / 100;
      }
    } else {
      return makeDimension(
        new Decimal(variableValue).toDecimalPlaces(6).toNumber(),
        useDTCG
      );
    }
  }

  if (variableType === 'TIMING') {
    // Figma stores durations in seconds, design tokens use milliseconds
    return makeDuration(variableValue, useDTCG);
  }

  if (variableType === 'EASING') {
    return normalizeEasing(variableValue, expandEasingPresets).value;
  }

  return variableValue;
};
