import { IResolver } from '@common/resolver';
import { warn } from '@common/warn';
import { toTokenName } from './tokenName';

export const mergeStylesIntoTokens = (
  variableTokens: any,
  styleTokens: any,
  storeStyleInCollection: string,
  resolver?: Pick<IResolver, 'warn'>
) => {
  let target = variableTokens;

  if (storeStyleInCollection && storeStyleInCollection !== 'none') {
    const collection = variableTokens[toTokenName(storeStyleInCollection)];

    // The setting outlives the file it was picked in, and there are no
    // collection groups with omitCollectionNames, so the collection may be
    // missing: keep the styles separate rather than failing the export.
    if (collection && typeof collection === 'object') {
      target = collection;
    } else {
      warn(
        resolver,
        `[tokens-bruecke] Collection "${storeStyleInCollection}" to add the styles to was not found in the tokens, so the styles are kept separate.`
      );
    }
  }

  styleTokens.forEach((styleToken) => {
    Object.assign(target, styleToken);
  });

  return variableTokens;
};
