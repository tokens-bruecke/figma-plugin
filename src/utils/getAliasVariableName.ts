import { concatAliasVariableName } from "./concatAliasVariableName";

export const getAliasVariableName = (variableId: string, modeName: string) => {
  const variableObj = figma.variables.getVariableById(variableId) as Variable;
  const collectionObj = figma.variables.getVariableCollectionById(
    variableObj.variableCollectionId
  ) as VariableCollection;
  const modesAmount = collectionObj.modes.length;

  // console.log("variable Obj", variableObj);
  // console.log("collection Obj", collectionObj);

  const variableName = variableObj.name;
  const collectionName = collectionObj.name;

  const aliasName = concatAliasVariableName({
    collectionName: collectionName,
    modeName: modeName,
    modesAmount: modesAmount,
    variableName: variableName,
  });

  // console.log("aliasName", aliasName);
  // console.log("// -------------------------- //");

  return aliasName;
};
