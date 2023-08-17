interface PropsI {
  collectionName: string;
  modeName: string;
  modesAmount: number;
  variableName: string;
}

export const concatAliasVariableName = (props: PropsI) => {
  const { collectionName, modeName, modesAmount, variableName } = props;

  const parentPath =
    modesAmount === 1 ? collectionName : `${collectionName}.${modeName}`;
  const variableParts = variableName.split("/");
  return `{${parentPath}.${variableParts.join(".")}}`;
};
