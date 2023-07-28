import { convertRGBA } from "./color/convertRGBA";
import { getAliasVariableName } from "./getAliasVariableName";

interface PropsI {
  variableValue: any;
  variableType: VariableResolvedDataType;
  colorMode: colorModeType;
  variables: Variable[];
  // collectionName: string;
  collections: VariableCollection[];
  modeName: string;
  modesAmount: number;
}

export const normalizeValue = (props: PropsI) => {
  const {
    variableValue,
    variableType,
    colorMode,
    variables,
    // collectionName,
    modeName,
    modesAmount,
  } = props;

  if (typeof variableValue === "object") {
    if (variableValue?.type === "VARIABLE_ALIAS") {
      // console.log("VARIABLE_ALIAS", variableValue);
      // console.log("variables", variables);

      const variable = variables.find(
        (variable) => variable.id === variableValue.id
      ) as Variable;
      const collectionId = variable.variableCollectionId;
      const collectionName = props.collections.find(
        (collection) => collection.id === collectionId
      )?.name as string;

      // console.log("collectionId", collectionId);
      // console.log("collectionName", collectionName);

      const aliasPath = getAliasVariableName({
        collectionName: collectionName,
        modeName: modeName,
        modesAmount: modesAmount,
        variableName: variable.name,
      });

      return aliasPath;
    }
  }

  if (variableType === "COLOR") {
    return convertRGBA(variableValue, colorMode);
  }

  if (variableType === "FLOAT") {
    return `${variableValue}px`;
  }

  return variableValue;
};
