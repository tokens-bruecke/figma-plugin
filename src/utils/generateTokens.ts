import { getAliasVariableName } from "./getAliasVariableName";
import { normalizeValue } from "./normalizeValue";
import { normilizeType } from "./normilizeType";

import { groupObjectNamesIntoCategories } from "./groupObjectNamesIntoCategories";

// console.clear();

export const generateTokens = async (
  variables: Variable[],
  collections: VariableCollection[],
  styleTokens: any[],
  JSONSettingsConfig: JSONSettingsConfigI
) => {
  const colorMode = JSONSettingsConfig.colorMode;

  const mergedVariables = {};

  collections.forEach((collection) => {
    let modes = {};

    const collectionName = collection.name;
    const isScopesIncluded = JSONSettingsConfig.includeScopes;
    const modesAmount = collection.modes.length;

    collection.modes.forEach((mode, index) => {
      const modeName = mode.name;

      const variablesPerMode = variables.reduce((result, variable) => {
        const variableModeId = Object.keys(variable.valuesByMode)[index];

        if (variableModeId === mode.modeId) {
          const aliasPath = getAliasVariableName(
            collectionName,
            modeName,
            modesAmount,
            variable.name
          );
          const variableObject = {
            $value: normalizeValue(
              variable.valuesByMode[variableModeId],
              variable.resolvedType,
              colorMode,
              variables,
              aliasPath
            ),
            $type: normilizeType(variable.resolvedType),
            $description: variable.description,
            // add scopes if true
            ...(isScopesIncluded && {
              scopes: variable.scopes,
            }),
            // add meta
            $extensions: {
              variableId: variable.id,
              aliasPath: aliasPath,
            },
          } as PluginTokenI;

          result[variable.name] = variableObject;
        }

        return result;
      }, {});

      // check amount of modes and assign to "modes" or "modes[modeName]" variable
      if (modesAmount === 1) {
        Object.assign(modes, groupObjectNamesIntoCategories(variablesPerMode));
      } else {
        modes[modeName] = groupObjectNamesIntoCategories(variablesPerMode);
      }
    });

    mergedVariables[collectionName] = modes;

    // assign style tokens to mergedVariables
    styleTokens.forEach((styleToken) => {
      // if selectedCollection is "separate" then merge styleTokens with mergedVariables
      if (JSONSettingsConfig.selectedCollection === "none") {
        Object.assign(mergedVariables, styleToken);
      }

      // if selectedCollection is a collection name then merge styleTokens with mergedVariables[collectionName]
      if (JSONSettingsConfig.selectedCollection === collectionName) {
        Object.assign(mergedVariables[collectionName], styleToken);
      }
    });
  });

  // add meta to mergedVariables
  mergedVariables["$meta"] = {
    useDTCGKeys: JSONSettingsConfig.useDTCGKeys,
    colorMode: JSONSettingsConfig.colorMode,
    variableCollections: JSONSettingsConfig.variableCollections,
    createdAt: new Date().toISOString(),
  } as MetaPropsI;

  return mergedVariables;
};
