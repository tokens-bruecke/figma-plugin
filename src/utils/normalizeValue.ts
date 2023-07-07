import { getAliasVariableName } from "./getAliasVariableName";
import { convertRGBA } from "./convertRGBA";

export const normalizeValue = (
  value: any,
  type: VariableResolvedDataType,
  colorMode: colorModeType,
  variables: Variable[],
  collectionAndModePath: string
) => {
  if (typeof value === "object") {
    if (value?.type === "VARIABLE_ALIAS") {
      const variable = variables.find(
        (variable) => variable.id === value.id
      ) as Variable;
      if (variable) {
        return getAliasVariableName(collectionAndModePath, variable);
      }
    }
  }

  if (type === "COLOR") {
    return convertRGBA(value, colorMode);
  }

  if (type === "FLOAT") {
    return `${value}px`;
  }

  return value;
};
