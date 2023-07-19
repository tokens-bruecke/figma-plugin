import { colorStylesToTokens } from "./colorStylesToTokens";
import { textStylesToTokens } from "./textStylesToTokens";
import { gridStylesToTokens } from "./gridStylesToTokens";
import { effectStylesToTokens } from "./effectStylesToTokens";

export const stylesToTokens = async (includedStyles, colorMode, tokens) => {
  let styleTokens = [];

  // Extract color tokens
  if (includedStyles.colors.isIncluded) {
    const colorTokens = await colorStylesToTokens(
      includedStyles.colors.customName,
      colorMode,
      tokens
    );

    styleTokens.push(colorTokens);
  }

  // Extract text tokens
  if (includedStyles.text.isIncluded) {
    const textTokens = await textStylesToTokens(includedStyles.text.customName);

    styleTokens.push(textTokens);
  }

  // Extract grid tokens
  if (includedStyles.grids.isIncluded) {
    const gridTokens = await gridStylesToTokens(
      includedStyles.grids.customName
    );

    styleTokens.push(gridTokens);
  }

  // Extract effect tokens
  if (includedStyles.effects.isIncluded) {
    const effectTokens = await effectStylesToTokens(
      includedStyles.effects.customName,

      colorMode
    );

    styleTokens.push(effectTokens);
  }

  return styleTokens;
};
