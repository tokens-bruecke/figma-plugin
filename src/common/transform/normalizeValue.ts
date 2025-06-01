import Decimal from "decimal.js";
import { IResolver } from "../resolver";
import { convertRGBA } from "./color/convertRGBA";
import { getAliasVariableName } from "./getAliasVariableName";

interface PropsI {
  variableValue: any;
  variableType: VariableResolvedDataType;
  variableScope: VariableScope[];
  colorMode: colorModeType;
  useDTCGKeys: boolean;
  includeValueStringKeyToAlias: boolean;
}

export const normalizeValue = (props: PropsI, resolver: IResolver) => {
  const {
    variableValue,
    variableType,
    variableScope,
    colorMode,
    useDTCGKeys,
    includeValueStringKeyToAlias,
  } = props;

  // console.log("variableValue", variableValue);

  if (variableValue?.type === "VARIABLE_ALIAS") {
    // console.log("VARIABLE_ALIAS", variableValue);

    const aliasVariableName = getAliasVariableName(
      variableValue.id,
      useDTCGKeys,
      includeValueStringKeyToAlias,
      resolver
    );

    return aliasVariableName;
  }

  if (variableType === "COLOR") {
    return convertRGBA(variableValue, colorMode);
  }

  if (variableType === "FLOAT") {
    if (variableScope.length === 1 && variableScope[0] === "FONT_WEIGHT") {
      return `${variableValue}`;
    } else if (variableScope.length === 1 && variableScope[0] === "OPACITY") {
      return Number(variableValue) / 100;
    } else {
      return `${new Decimal(variableValue).toDecimalPlaces(6).toNumber()}px`;
    }
  }

  return variableValue;
};
