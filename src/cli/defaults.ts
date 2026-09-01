/// <reference path="../../global.d.ts" />

/**
 * Default export settings, shared by the export command and `init` so a
 * generated config file always matches what the CLI would do on its own.
 */
export const defaultConfig: ExportSettingsI = {
  includedStyles: {
    text: {
      isIncluded: false,
      customName: 'Typography-styles',
    },
    effects: {
      isIncluded: false,
      customName: 'Effect-styles',
    },
    grids: {
      isIncluded: false,
      customName: 'Grid-styles',
    },
    colors: {
      isIncluded: false,
      customName: 'Color-styles',
    },
  },
  storeStyleInCollection: 'none',
  colorMode: 'hex',
  includeScopes: false,
  includeValueStringKeyToAlias: false,
  includeFigmaMetaData: false,
  useDTCG: true,
  usePercentageOpacity: false,
  expandEasingPresets: true,
  splitByCollection: false,
  splitByMode: false,
  omitCollectionNames: false,
};

export const CONFIG_SCHEMA_URL =
  'https://raw.githubusercontent.com/tokens-bruecke/figma-plugin/main/schemas/cli-options.schema.json';

export const DEFAULT_CONFIG_FILENAME = 'tokens-bruecke.config.json';
