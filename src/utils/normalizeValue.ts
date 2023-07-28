import { convertRGBA } from "./color/convertRGBA";

interface PropsI {
  variableValue: any;
  variableType: VariableResolvedDataType;
  colorMode: colorModeType;
  allAliases:
    | {
        [key: string]: string;
      }[]
    | {};
}

export const normalizeValue = (props: PropsI) => {
  const { variableValue, variableType, colorMode, allAliases } = props;

  if (typeof variableValue === "object") {
    if (variableValue?.type === "VARIABLE_ALIAS") {
      // console.log("VARIABLE_ALIAS", variableValue);
      // console.log("variables", variables);

      const aliasVariableId = variableValue.id;
      const aliasVariablePath = allAliases[aliasVariableId];

      // console.log(variableValue, aliasVariablePath);

      return aliasVariablePath;
    }
  }

  if (variableType === "COLOR") {
    return convertRGBA(variableValue, colorMode);
  }

  if (variableType === "FLOAT") {
    return `${variableValue}px`;
  }

  return variableValue;
};
