/// <reference path="../../global.d.ts" />
import { defaultConfig } from './defaults';

/** The export flags that override the config file. */
export interface CliOverrides {
  splitByCollection?: boolean;
  splitByMode?: boolean;
  omitCollectionNames?: boolean;
  omitCreatedAt?: boolean;
}

/**
 * Each style type in `includedStyles` is merged with its default, so a config
 * that only sets `{ "text": { "isIncluded": true } }` keeps the default
 * `customName` and the other style types.
 */
const mergeIncludedStyles = (
  includedStyles: Partial<Record<string, Partial<JSONSettingsStyleType>>> = {}
): IncludedStylesI => {
  const merged = { ...defaultConfig.includedStyles } as Record<string, any>;
  for (const [styleType, settings] of Object.entries(includedStyles)) {
    merged[styleType] = { ...merged[styleType], ...settings };
  }
  return merged as IncludedStylesI;
};

/**
 * Builds the export settings: explicit CLI flags override the config file,
 * which overrides the defaults.
 */
export const resolveExportOptions = (
  config: Record<string, any>,
  overrides: CliOverrides
): ExportSettingsI => ({
  ...defaultConfig,
  ...config,
  includedStyles: mergeIncludedStyles(config.includedStyles),
  // Support legacy `useDTCGKeys` config files (deprecated alias)
  useDTCG: config.useDTCG ?? config.useDTCGKeys ?? defaultConfig.useDTCG,
  splitByCollection:
    overrides.splitByCollection ??
    config.splitByCollection ??
    defaultConfig.splitByCollection,
  splitByMode:
    overrides.splitByMode ?? config.splitByMode ?? defaultConfig.splitByMode,
  omitCollectionNames:
    overrides.omitCollectionNames ??
    config.omitCollectionNames ??
    defaultConfig.omitCollectionNames,
  omitCreatedAt:
    overrides.omitCreatedAt ??
    config.omitCreatedAt ??
    defaultConfig.omitCreatedAt,
});

/**
 * `--stdout` prints a single JSON document, so it cannot be combined with a
 * split, whether the split comes from a flag or from the config file.
 * Returns the error message, or `null` when the options are compatible.
 */
export const getStdoutSplitConflict = (
  options: Pick<ExportSettingsI, 'splitByCollection' | 'splitByMode'>
): string | null => {
  const splits = [
    options.splitByCollection && 'splitByCollection',
    options.splitByMode && 'splitByMode',
  ].filter(Boolean);
  if (splits.length === 0) {
    return null;
  }
  return `--stdout cannot be combined with ${splits.join(
    ' / '
  )} (splits produce multiple files). Turn it off in the config file, or use --output.`;
};
