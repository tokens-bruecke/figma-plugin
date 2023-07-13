export const getAliasVariableName = (
  collectionName: string,
  modeName: string,
  variableName: string
) => {
  const parentPath = `${collectionName}.${modeName}`;
  const variableParts = variableName.split("/");
  return `{${parentPath}.${variableParts.join(".")}}`;
};
