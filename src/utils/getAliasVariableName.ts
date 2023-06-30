export const getAliasVariableName = (
  collectionAndModePath: string,
  variable: Variable
) => {
  const variableParts = variable.name.split("/");
  return `{${collectionAndModePath}.${variableParts.join(".")}}`;
};
