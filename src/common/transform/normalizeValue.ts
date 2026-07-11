import Decimal from 'decimal.js';
import { IResolver } from '@common/resolver';
import { convertRGBA } from './color/convertRGBA';
import { getAliasVariableName } from './getAliasVariableName';
import { makeDimension } from './makeDimension';

interface PropsI {
  variableValue: any;
  variableType: VariableResolvedDataType;
  variableScope: VariableScope[];
  colorMode: colorModeType;
  useDTCG: boolean;
  includeValueStringKeyToAlias: boolean;
  usePercentageOpacity: boolean;
  omitCollectionNames?: boolean;
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

  if (variableType === 'COLOR') {
    return convertRGBA(variableValue, colorMode);
  }

  if (variableType === 'FLOAT') {
    if (variableScope.length === 1 && variableScope[0] === 'FONT_WEIGHT') {
      return Number(variableValue);
    } else if (variableScope.length === 1 && variableScope[0] === 'OPACITY') {
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

  return variableValue;
};
