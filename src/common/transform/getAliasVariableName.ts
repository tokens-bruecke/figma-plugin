import { getTokenKeyName } from "./getTokenKeyName";
import { IResolver } from "../resolver";

export const getAliasVariableName = (
  variableId: string,
  isDTCGForamt: boolean,
  includeValueAliasString: boolean,
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
  // const modesAmount = collectionObj.modes.length;

  const variableName = variableObj.name;
  const collectionName = collectionObj.name;

  // console.log("collectionObj", collectionObj);
  // console.log("modeName", modeName);
  // console.log("modesAmount", modesAmount);

  const valueKey = getTokenKeyName(isDTCGForamt).value;
  const isValueKeyIncluded = includeValueAliasString ? `.${valueKey}` : "";

  const variableParts = variableName.split("/");
  const aliasName = `{${collectionName}.${variableParts.join(
    "."
  )}${isValueKeyIncluded}}`;

  return aliasName;
};
