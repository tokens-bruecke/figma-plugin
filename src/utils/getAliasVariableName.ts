export const getAliasVariableName = (
  collectionName: string,
  modeName: string,
  modesAmount: number,
  variableName: string
) => {
  const parentPath =
    modesAmount === 1 ? collectionName : `${collectionName}.${modeName}`;
  const variableParts = variableName.split("/");
  return `{${parentPath}.${variableParts.join(".")}}`;
};
