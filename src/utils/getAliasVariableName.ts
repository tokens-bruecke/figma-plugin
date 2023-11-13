import { getTokenKeyName } from "./getTokenKeyName";

export const getAliasVariableName = (
  variableId: string,
  modeName: string,
  modesAmount: number,
  isDTCGForamt: boolean,
  includeValueAliasString: boolean
) => {
  const variableObj = figma.variables.getVariableById(variableId) as Variable;
  const collectionObj = figma.variables.getVariableCollectionById(
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

  const parentPath =
    modesAmount === 1 ? collectionName : `${collectionName}.${modeName}`;
  const variableParts = variableName.split("/");
  const aliasName = `{${parentPath}.${variableParts.join(
    "."
  )}${isValueKeyIncluded}}`;

  return aliasName;
};
