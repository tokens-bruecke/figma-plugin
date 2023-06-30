export const normilizeType = (type: VariableResolvedDataType) => {
  switch (type) {
    case "COLOR":
      return "color";
    case "FLOAT":
      return "dimension";
    case "STRING":
      return "string";
    case "BOOLEAN":
      return "boolean";

    default:
      return "string";
  }
};
