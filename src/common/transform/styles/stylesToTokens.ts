import { textStylesToTokens } from "./textStylesToTokens";
import { gridStylesToTokens } from "./gridStylesToTokens";
import { effectStylesToTokens } from "./effectStylesToTokens";
import { IResolver } from "../../resolver";

export const stylesToTokens = async (
  props: ExportSettingsI,
  resolver: IResolver
) => {
  const { includedStyles, colorMode, useDTCGKeys, includeValueAliasString } =
    props;
  let styleTokens = [];

  if (!includedStyles) {
    return styleTokens;
  }

  // Extract text tokens
  if (includedStyles.text.isIncluded) {
    const textTokens = await textStylesToTokens(
      includedStyles.text.customName,
      useDTCGKeys,
      includeValueAliasString,
      resolver
    );

    styleTokens.push(textTokens);
  }

  // Extract grid tokens
  if (includedStyles.grids.isIncluded) {
    const gridTokens = await gridStylesToTokens(
      includedStyles.grids.customName,
      useDTCGKeys,
      resolver
    );

    styleTokens.push(gridTokens);
  }

  // Extract effect tokens
  if (includedStyles.effects.isIncluded) {
    const effectTokens = await effectStylesToTokens(
      includedStyles.effects.customName,
      colorMode,
      useDTCGKeys,
      includeValueAliasString,
      resolver
    );

    styleTokens.push(effectTokens);
  }

  return styleTokens;
};
