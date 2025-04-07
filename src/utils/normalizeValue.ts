import { getAliasVariableName } from "./getAliasVariableName";
import { convertRGBA } from "./color/convertRGBA";
import { IResolver } from "../common/resolver";

interface PropsI {
  variableValue: any;
  variableType: VariableResolvedDataType;
  variableScope: VariableScope[];
  colorMode: colorModeType;
  useDTCGKeys: boolean;
  includeValueAliasString: boolean;
}

export const normalizeValue = (props: PropsI, resolver: IResolver) => {
  const {
    variableValue,
    variableType,
    variableScope,
    colorMode,
    useDTCGKeys,
    includeValueAliasString,
  } = props;

  // console.log("variableValue", variableValue);

  if (variableValue?.type === "VARIABLE_ALIAS") {
    // console.log("VARIABLE_ALIAS", variableValue);

    const aliasVariableName = getAliasVariableName(
      variableValue.id,
      useDTCGKeys,
      includeValueAliasString,
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
      return `${variableValue}px`;
    }
  }

  return variableValue;
};
