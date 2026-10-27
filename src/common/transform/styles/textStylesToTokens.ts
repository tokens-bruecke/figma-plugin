import { groupObjectNamesIntoCategories } from '@common/transform/groupObjectNamesIntoCategories';
import { ROOT_TOKEN_KEY } from '@common/transform/rootTokens';

import { getLineHeight } from '@common/transform/text/getLineHeight';
import { getLetterSpacing } from '@common/transform/text/getLetterSpacing';
import { getFontStyleAndWeight } from '@common/transform/text/getFontStyleAndWeight';
import { getTokenKeyName } from '@common/transform/getTokenKeyName';
import { getAliasVariableName } from '@common/transform/getAliasVariableName';
import { makeDimension } from '@common/transform/makeDimension';
import { IResolver } from '@common/resolver';
import { warnSkippedStyle } from './warnSkippedStyle';

export const textStylesToTokens = async (
  customName: string,
  isDTCGFormat: boolean,
  includeValueStringKeyToAlias: boolean,
  resolver: IResolver,
  omitCollectionNames = false
) => {
  const keyNames = getTokenKeyName(isDTCGFormat);
  const textStyles = await resolver.getLocalTextStyles();

  let textTokens = {};

  const allTextStyles = {};

  for (const style of textStyles) {
    try {
      allTextStyles[style.name] = await textStyleToToken(style);
    } catch (error) {
      warnSkippedStyle(resolver, style.name, error);
    }
  }

  async function textStyleToToken(style: TextStyle) {
    let aliasVariables = {} as TextStyle['boundVariables'];
    const boundVariables = style.boundVariables;

    if (boundVariables) {
      for (const key of Object.keys(
        boundVariables
      ) as VariableBindableTextField[]) {
        aliasVariables = {
          ...aliasVariables,
          [key]: await getAliasVariableName(
            boundVariables[key].id,
            isDTCGFormat,
            includeValueStringKeyToAlias,
            resolver,
            omitCollectionNames
          ),
        };
      }
    }

    const fontStyleWeight = getFontStyleAndWeight(style.fontName.style);
    const exactFontWeight =
      (style as TextStyle & { fontWeight?: number }).fontWeight ??
      style.fontName.variationSettings?.wght;
    return {
      [keyNames.type]: 'typography',
      [keyNames.value]: {
        fontFamily: aliasVariables.fontFamily || style.fontName.family,
        fontWeight:
          aliasVariables.fontWeight ??
          exactFontWeight ??
          fontStyleWeight.weight,
        fontStyle: aliasVariables.fontStyle || fontStyleWeight.style,
        fontSize:
          aliasVariables.fontSize ||
          makeDimension(style.fontSize, isDTCGFormat),
        lineHeight:
          aliasVariables.lineHeight ||
          getLineHeight(style.lineHeight, isDTCGFormat),
        letterSpacing:
          aliasVariables.letterSpacing ||
          getLetterSpacing(style.letterSpacing, isDTCGFormat),
        paragraphSpacing:
          aliasVariables.paragraphSpacing ||
          (isDTCGFormat
            ? makeDimension(style.paragraphSpacing, true)
            : `${style.paragraphSpacing}`),
        paragraphIndent:
          aliasVariables.paragraphIndent ||
          (isDTCGFormat
            ? makeDimension(style.paragraphIndent, true)
            : `${style.paragraphIndent}`),
        textDecoration: style.textDecoration,
        textCase: style.textCase,
      },
      [keyNames.description]: style.description,
      $extensions: {
        styleId: style.id,
      },
    } as unknown as TypographyTokenI;
  }

  textTokens[customName] = groupObjectNamesIntoCategories(
    allTextStyles,
    isDTCGFormat ? ROOT_TOKEN_KEY : undefined
  );

  return textTokens;
};
