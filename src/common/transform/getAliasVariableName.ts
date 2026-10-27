import { getTokenKeyName } from './getTokenKeyName';
import { toTokenName } from './tokenName';
import { IResolver } from '@common/resolver';
import { warn } from '@common/warn';

export const getAliasVariableName = async (
  variableId: string,
  isDTCGFormat: boolean,
  includeValueStringKeyToAlias: boolean,
  resolver: IResolver,
  omitCollectionNames = false
) => {
  const variableObj = (await resolver.getVariableById(
    variableId
  )) as Variable | null;
  if (!variableObj) {
    warn(
      resolver,
      `[tokens-bruecke] Cannot find variable ${variableId}, so its alias is exported as "#missing#" (is it a library variable?)`
    );
    return '#missing#';
  }
  const collectionObj = (await resolver.getVariableCollectionById(
    variableObj.variableCollectionId
  )) as VariableCollection | null;
  if (!collectionObj) {
    warn(
      resolver,
      `[tokens-bruecke] Cannot find the collection of variable "${variableObj.name}", so its alias is exported as "#missing#" (is the collection hidden from publishing, or in a library?)`
    );
    return '#missing#';
  }

  const variableName = variableObj.name;
  const collectionName = toTokenName(collectionObj.name);

  const valueKey = getTokenKeyName(isDTCGFormat).value;
  const isValueKeyIncluded = includeValueStringKeyToAlias ? `.${valueKey}` : '';

  const variableParts = variableName.split('/');

  const aliasName = omitCollectionNames
    ? `{${variableParts.join('.')}${isValueKeyIncluded}}`
    : `{${collectionName}.${variableParts.join('.')}${isValueKeyIncluded}}`;

  return aliasName;
};
