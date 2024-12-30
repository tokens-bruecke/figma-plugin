import { getAliasVariableName } from "./getAliasVariableName";
import { convertRGBA } from "./color/convertRGBA";

interface PropsI {
  variableValue: any;
  variableType: VariableResolvedDataType;
  variableScope: VariableScope[];
  colorMode: colorModeType;
  isDTCGForamt: boolean;
  includeValueAliasString: boolean;

}

export const normalizeValue = (props: PropsI) => {
  const {
    variableValue,
    variableType,
    variableScope,
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
    if (variableScope.length === 1 && variableScope[0] === "FONT_WEIGHT") {
      return `${variableValue}`;
    } else if (variableScope.length === 1 && variableScope[0] === "OPACITY") {
      return Number(variableValue) / 100;
    } else {
      return `${variableValue}px`
    }
  }

  return variableValue;
};
