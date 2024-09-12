import { groupObjectNamesIntoCategories } from "../groupObjectNamesIntoCategories";

import { getLineHeight } from "../text/getLineHeight";
import { getLetterSpacing } from "../text/getLetterSpacing";
import { getFontWeight } from "../text/getFontWeight";
import { getTokenKeyName } from "../getTokenKeyName";
// import {normalizeValue} from "../normalizeValue";
import {getAliasVariableName} from "../getAliasVariableName";


export const textStylesToTokens = async (
  customName: string,
  isDTCGForamt: boolean,
  includeValueAliasString: boolean
) => {
  const keyNames = getTokenKeyName(isDTCGForamt);
  const textStyles = figma.getLocalTextStyles();

  let textTokens = {};

  const allTextStyles = textStyles.reduce((result, style) => {

    let aliasNames = {} as TextStyle["boundVariables"];
    const boundVariables = style.boundVariables;

    if (boundVariables) {
      Object.keys(boundVariables).forEach((key: VariableBindableTextField) => {
        aliasNames = {
          ...aliasNames,
          [key]: getAliasVariableName(
            boundVariables[key].id,
            isDTCGForamt,
            includeValueAliasString
          ),
        }
      });
    }

    const styleObject = {
      [keyNames.type]: "typography",
      [keyNames.value]: {
        fontFamily: aliasNames.fontFamily || style.fontName.family,
        fontWeight: aliasNames.fontWeight || getFontWeight(style.fontName.style),
        fontSize: aliasNames.fontSize || `${style.fontSize}px`,
        lineHeight: aliasNames.lineHeight || getLineHeight(style.lineHeight),
        letterSpacing: aliasNames.letterSpacing || getLetterSpacing(style.letterSpacing),
        textDecoration: style.textDecoration,
        textCase: style.textCase
      },
      [keyNames.description]: style.description,
      $extensions: {
        styleId: style.id,
      },
    } as unknown as TypographyTokenI;

    result[style.name] = styleObject;

    return result;
  }, {});

  textTokens[customName] = groupObjectNamesIntoCategories(allTextStyles);

  return textTokens;
};
