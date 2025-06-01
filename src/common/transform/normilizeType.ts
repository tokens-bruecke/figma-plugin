import { IResolver } from "../resolver";

export const normilizeType = (
  type: VariableResolvedDataType,
  variableScopes: VariableScope[],
  variableValue: any,
  collectionDefaultModeId: string,
  resolver: IResolver
) => {
  // Check for alias
  if (variableValue?.type === "VARIABLE_ALIAS" && resolver) {
    const aliasedVariable = resolver.getVariableById(variableValue.id);
    if (aliasedVariable) {
      // Recursively resolve the type of the aliased variable
      return normilizeType(
        aliasedVariable.resolvedType,
        aliasedVariable.scopes,
        aliasedVariable.valuesByMode[collectionDefaultModeId],
        collectionDefaultModeId,
        resolver
      );
    }
  }

  switch (type) {
    case "COLOR":
      return "color";
    case "FLOAT":
      if (variableScopes.length === 1) {
        if (variableScopes[0] === "FONT_WEIGHT") {
          return "string";
        } else if (variableScopes[0] === "OPACITY") {
          return "number";
        }
      }
      return "dimension";
    case "STRING":
      return "string";
    case "BOOLEAN":
      return "boolean";
    default:
      return "string";
  }
};