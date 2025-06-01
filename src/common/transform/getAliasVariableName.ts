import { getTokenKeyName } from "./getTokenKeyName";
import { IResolver } from "../resolver";

export const getAliasVariableName = (
  variableId: string,
  isDTCGForamt: boolean,
  includeValueStringKeyToAlias: boolean,
  resolver: IResolver
) => {
  const variableObj = resolver.getVariableById(variableId) as Variable;
  if (!variableObj) {
    console.log("cannot find variable", variableId);
    return "#missing#";
  }
  const collectionObj = resolver.getVariableCollectionById(
    variableObj.variableCollectionId
  ) as VariableCollection;

  const variableName = variableObj.name;
  const collectionName = collectionObj.name;

  const valueKey = getTokenKeyName(isDTCGForamt).value;
  const isValueKeyIncluded = includeValueStringKeyToAlias ? `.${valueKey}` : "";

  const variableParts = variableName.split("/");
  const aliasName = `{${collectionName}.${variableParts.join(
    "."
  )}${isValueKeyIncluded}}`;

  return aliasName;
};
