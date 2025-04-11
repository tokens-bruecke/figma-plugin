import { groupObjectNamesIntoCategories } from "../groupObjectNamesIntoCategories";

import { getLineHeight } from "../text/getLineHeight";
import { getLetterSpacing } from "../text/getLetterSpacing";
import { getFontStyleAndWeight } from "../text/getFontStyleAndWeight";
import { getTokenKeyName } from "../getTokenKeyName";
import { getAliasVariableName } from "../getAliasVariableName";
import { IResolver } from "../../resolver";

export const textStylesToTokens = async (
  customName: string,
  isDTCGForamt: boolean,
  includeValueAliasString: boolean,
  resolver: IResolver
) => {
  const keyNames = getTokenKeyName(isDTCGForamt);
  const textStyles = await resolver.getLocalTextStyles();

  // console.log("textStyles", textStyles);

  let textTokens = {};

  const allTextStyles = textStyles.reduce((result, style) => {
    let aliasVariables = {} as TextStyle["boundVariables"];
    const boundVariables = style.boundVariables;

    if (boundVariables) {
      Object.keys(boundVariables).forEach((key: VariableBindableTextField) => {
        aliasVariables = {
          ...aliasVariables,
          [key]: getAliasVariableName(
            boundVariables[key].id,
            isDTCGForamt,
            includeValueAliasString,
            resolver
          ),
        };
      });
    }

    const fontStyleWeight = getFontStyleAndWeight(style.fontName.style);
    const styleObject = {
      [keyNames.type]: "typography",
      [keyNames.value]: {
        fontFamily: aliasVariables.fontFamily || style.fontName.family,
        fontWeight: aliasVariables.fontWeight || fontStyleWeight.weight,
        fontStyle: aliasVariables.fontStyle || fontStyleWeight.style,
        fontSize: aliasVariables.fontSize || `${style.fontSize}px`,
        lineHeight:
          aliasVariables.lineHeight || getLineHeight(style.lineHeight),
        letterSpacing:
          aliasVariables.letterSpacing || getLetterSpacing(style.letterSpacing),
        paragraphSpacing:
          aliasVariables.paragraphSpacing || `${style.paragraphSpacing}`,
        paragraphIndent:
          aliasVariables.paragraphIndent || `${style.paragraphIndent}`,
        textDecoration: style.textDecoration,
        textCase: style.textCase,
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
