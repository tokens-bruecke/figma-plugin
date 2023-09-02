import { getTokenKeyName } from "./getTokenKeyName";

export const getAliasVariableName = (
  variableId: string,
  modeName: string,
  isDTCGForamt: boolean
) => {
  const variableObj = figma.variables.getVariableById(variableId) as Variable;
  const collectionObj = figma.variables.getVariableCollectionById(
    variableObj.variableCollectionId
  ) as VariableCollection;
  const modesAmount = collectionObj.modes.length;

  const variableName = variableObj.name;
  const collectionName = collectionObj.name;

  const valueKey = getTokenKeyName(isDTCGForamt).value;

  const parentPath =
    modesAmount === 1 ? collectionName : `${collectionName}.${modeName}`;
  const variableParts = variableName.split("/");
  const aliasName = `{${parentPath}.${variableParts.join(".")}.${valueKey}}`;

  return aliasName;
};
