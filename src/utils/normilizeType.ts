export const normilizeType = (type: VariableResolvedDataType, variableScopes: VariableScope[]) => {
  switch (type) {
    case "COLOR":
      return "color";
    case "FLOAT":
      if (variableScopes.length === 1 && variableScopes[0] === "FONT_WEIGHT") {
        return "string";
      } else {
        return "dimension";
      }
    case "STRING":
      return "string";
    case "BOOLEAN":
      return "boolean";

    default:
      return "string";
  }
};
