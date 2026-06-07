import { stylesToTokens } from './transform/styles/stylesToTokens';

import { variablesToTokens } from './transform/variablesToTokens';
import { mergeStylesIntoTokens } from './transform/mergeStylesIntoTokens';
import { IResolver } from './resolver';

/**
 * Recursively collect all mode names found in $extensions.mode across a token tree.
 */
const collectModeNames = (tokens: Record<string, any>): Set<string> => {
  const modes = new Set<string>();
  for (const value of Object.values(tokens)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$value' in value) {
        const modeMap = value.$extensions?.mode;
        if (modeMap && typeof modeMap === 'object') {
          Object.keys(modeMap).forEach((m) => modes.add(m));
        }
      } else {
        for (const m of collectModeNames(value)) {
          modes.add(m);
        }
      }
    }
  }
  return modes;
};

/**
 * Recursively replace each token's $value with the value for the given mode.
 * Removes $extensions.mode from the output.
 */
const applyModeToTokens = (tokens: Record<string, any>, modeName: string): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$value' in value) {
        const modeValue = value.$extensions?.mode?.[modeName];
        const { mode: _mode, ...restExtensions } = value.$extensions || {};
        const extensions = Object.keys(restExtensions).length > 0 ? restExtensions : undefined;
        result[key] = {
          ...value,
          $value: modeValue !== undefined ? modeValue : value.$value,
          ...(extensions ? { $extensions: extensions } : { $extensions: undefined }),
        };
        if (result[key].$extensions === undefined) {
          delete result[key].$extensions;
        }
      } else {
        result[key] = applyModeToTokens(value, modeName);
      }
    } else {
      result[key] = value;
    }
  }
  return result;
};

const buildMeta = (
  config: ExportSettingsI,
  variableCollections: VariableCollection[]
): MetaPropsI => ({
  useDTCGKeys: config.useDTCGKeys,
  colorMode: config.colorMode,
  variableCollections: variableCollections.map((collection) => collection.name),
  createdAt: new Date().toISOString(),
});

export const getTokens = async (
  resolver: IResolver,
  config: ExportSettingsI,
  _state?: PluginStateI
) => {
  const variableCollection = await resolver.getLocalVariableCollections();
  const variables = await resolver.getLocalVariables();

  // convert variables to tokens
  const variableTokens = await variablesToTokens(
    variables,
    variableCollection,
    config,
    resolver
  );

  // convert styles to tokens
  const styleTokens = await stylesToTokens(config, resolver);

  // merge variables and styles
  const mergedVariables = mergeStylesIntoTokens(
    variableTokens,
    styleTokens,
    config.storeStyleInCollection
  );

  const metaData = buildMeta(config, variableCollection);

  if (config.splitByMode) {
    // Return a map of { "collectionName/modeName": modeTokens } for each mode in each collection
    const result: Record<string, any> = {};
    for (const collectionName of Object.keys(mergedVariables)) {
      const collectionTokens = mergedVariables[collectionName];
      const modeNames = collectModeNames(collectionTokens);
      if (modeNames.size === 0) {
        // No multi-mode data — treat as single file for this collection
        result[collectionName] = {
          ...collectionTokens,
          $extensions: { 'tokens-bruecke-meta': metaData },
        };
      } else {
        for (const modeName of modeNames) {
          const modeTokens = applyModeToTokens(collectionTokens, modeName);
          result[`${collectionName}/${modeName}`] = {
            ...modeTokens,
            $extensions: { 'tokens-bruecke-meta': metaData },
          };
        }
      }
    }
    return result;
  }

  if (config.splitByCollection) {
    // Return a map of { collectionName: tokens } where each entry gets its own meta
    const result: Record<string, any> = {};
    for (const key of Object.keys(mergedVariables)) {
      result[key] = {
        ...mergedVariables[key],
        $extensions: { 'tokens-bruecke-meta': metaData },
      };
    }
    return result;
  }

  // add meta to mergedVariables
  mergedVariables['$extensions'] = {
    'tokens-bruecke-meta': metaData,
  };

  // console.log("mergedVariables", mergedVariables);

  return mergedVariables;
};
