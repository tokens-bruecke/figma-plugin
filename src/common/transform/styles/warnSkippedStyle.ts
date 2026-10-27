import { IResolver } from '@common/resolver';
import { warn } from '@common/warn';

/**
 * One style the plugin cannot convert must not abort the whole export: the
 * converters leave it out and say so, like `variablesToTokens` does for
 * variables.
 */
export const warnSkippedStyle = (
  resolver: IResolver,
  styleName: string,
  error: any
) => {
  warn(
    resolver,
    `[tokens-bruecke] Skipped style "${styleName}": ${error?.message ?? error}`
  );
};
