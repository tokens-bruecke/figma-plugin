import { convertRGBA } from "./color/convertRGBA";

export const normalizeValue = (
  value: any,
  type: VariableResolvedDataType,
  colorMode: colorModeType,
  variables: Variable[],
  aliasPath: string
) => {
  if (typeof value === "object") {
    if (value?.type === "VARIABLE_ALIAS") {
      const variable = variables.find(
        (variable) => variable.id === value.id
      ) as Variable;
      if (variable) {
        return aliasPath;
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
