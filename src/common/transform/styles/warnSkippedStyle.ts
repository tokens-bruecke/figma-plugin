/**
 * One style the plugin cannot convert must not abort the whole export: the
 * converters leave it out and say so, like `variablesToTokens` does for
 * variables.
 */
export const warnSkippedStyle = (styleName: string, error: any) => {
  console.warn(
    `[tokens-bruecke] Skipped style "${styleName}": ${error?.message ?? error}`
  );
};
