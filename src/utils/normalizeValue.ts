import { getAliasVariableName } from "./getAliasVariableName";
import { convertRGBA } from "./color/convertRGBA";

interface PropsI {
  variableValue: any;
  variableType: VariableResolvedDataType;
  colorMode: colorModeType;
  isDTCGForamt: boolean;
  includeValueAliasString: boolean;
}

export const normalizeValue = (props: PropsI) => {
  const {
    variableValue,
    variableType,
    colorMode,
    isDTCGForamt,
    includeValueAliasString,
  } = props;

  // console.log("variableValue", variableValue);

  if (variableValue?.type === "VARIABLE_ALIAS") {
    // console.log("VARIABLE_ALIAS", variableValue);

    const aliasVariableName = getAliasVariableName(
      variableValue.id,
      isDTCGForamt,
      includeValueAliasString
    );

    return aliasVariableName;
  }

  if (variableType === "COLOR") {
    return convertRGBA(variableValue, colorMode);
  }

  if (variableType === "FLOAT") {
    return `${variableValue}px`;
  }

  return variableValue;
};
