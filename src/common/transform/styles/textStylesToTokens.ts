import { groupObjectNamesIntoCategories } from '@common/transform/groupObjectNamesIntoCategories';

import { getLineHeight } from '@common/transform/text/getLineHeight';
import { getLetterSpacing } from '@common/transform/text/getLetterSpacing';
import { getFontStyleAndWeight } from '@common/transform/text/getFontStyleAndWeight';
import { getTokenKeyName } from '@common/transform/getTokenKeyName';
import { getAliasVariableName } from '@common/transform/getAliasVariableName';
import { makeDimension } from '@common/transform/makeDimension';
import { IResolver } from '@common/resolver';

export const textStylesToTokens = async (
  customName: string,
  isDTCGForamt: boolean,
  includeValueStringKeyToAlias: boolean,
  resolver: IResolver
) => {
  const keyNames = getTokenKeyName(isDTCGForamt);
  const textStyles = await resolver.getLocalTextStyles();

  let textTokens = {};

  const allTextStyles = {};

  for (const style of textStyles) {
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
            isDTCGForamt,
            includeValueStringKeyToAlias,
            resolver
          ),
        };
      }
    }

    const fontStyleWeight = getFontStyleAndWeight(style.fontName.style);
    const styleObject = {
      [keyNames.type]: 'typography',
      [keyNames.value]: {
        fontFamily: aliasVariables.fontFamily || style.fontName.family,
        fontWeight: aliasVariables.fontWeight || fontStyleWeight.weight,
        fontStyle: aliasVariables.fontStyle || fontStyleWeight.style,
        fontSize:
          aliasVariables.fontSize ||
          makeDimension(style.fontSize, isDTCGForamt),
        lineHeight:
          aliasVariables.lineHeight ||
          getLineHeight(style.lineHeight, isDTCGForamt),
        letterSpacing:
          aliasVariables.letterSpacing ||
          getLetterSpacing(style.letterSpacing, isDTCGForamt),
        paragraphSpacing:
          aliasVariables.paragraphSpacing ||
          (isDTCGForamt
            ? makeDimension(style.paragraphSpacing, true)
            : `${style.paragraphSpacing}`),
        paragraphIndent:
          aliasVariables.paragraphIndent ||
          (isDTCGForamt
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

    allTextStyles[style.name] = styleObject;
  }

  textTokens[customName] = groupObjectNamesIntoCategories(allTextStyles);

  return textTokens;
};
