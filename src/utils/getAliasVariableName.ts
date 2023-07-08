export const getAliasVariableName = (
  collectionAndModePath: string,
  variableName: string
) => {
  const variableParts = variableName.split("/");
  return `{${collectionAndModePath}.${variableParts.join(".")}}`;
};
