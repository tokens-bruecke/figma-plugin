import { textStylesToTokens } from "./textStylesToTokens";
import { gridStylesToTokens } from "./gridStylesToTokens";
import { effectStylesToTokens } from "./effectStylesToTokens";

interface iProps {
  includedStyles: IncludedStylesI;
  colorMode: colorModeType;
  isDTCGForamt: boolean;
  includeValueAliasString: boolean;
}

export const stylesToTokens = async (props: iProps) => {
  const { includedStyles, colorMode, isDTCGForamt, includeValueAliasString } = props;
  let styleTokens = [];

  if (!includedStyles) {
    return styleTokens;
  }

  // Extract text tokens
  if (includedStyles.text.isIncluded) {
    const textTokens = await textStylesToTokens(
      includedStyles.text.customName,
      isDTCGForamt,
      includeValueAliasString
    );

    styleTokens.push(textTokens);
  }

  // Extract grid tokens
  if (includedStyles.grids.isIncluded) {
    const gridTokens = await gridStylesToTokens(
      includedStyles.grids.customName,
      isDTCGForamt
    );

    styleTokens.push(gridTokens);
  }

  // Extract effect tokens
  if (includedStyles.effects.isIncluded) {
    const effectTokens = await effectStylesToTokens(
      includedStyles.effects.customName,
      colorMode,
      isDTCGForamt,
      includeValueAliasString
    );

    styleTokens.push(effectTokens);
  }

  return styleTokens;
};
