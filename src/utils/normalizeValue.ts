import { getAliasVariableName } from "./getAliasVariableName";
import { normilizeRGBAColor } from "./normilizeRGBAColor";

export const normalizeValue = (
  value: any,
  type: VariableResolvedDataType,
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
    return normilizeRGBAColor(value);
  }

  if (type === "FLOAT") {
    return `${value}px`;
  }

  return value;
};
