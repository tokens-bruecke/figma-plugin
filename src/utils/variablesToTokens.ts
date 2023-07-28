import { getAliasVariableName } from "./getAliasVariableName";
import { normalizeValue } from "./normalizeValue";
import { normilizeType } from "./normilizeType";

import { groupObjectNamesIntoCategories } from "./groupObjectNamesIntoCategories";

// console.clear();

export const variablesToTokens = async (
  variables: Variable[],
  collections: VariableCollection[],
  JSONSettingsConfig: JSONSettingsConfigI
) => {
  const colorMode = JSONSettingsConfig.colorMode;
  const mergedVariables = {};

  const allAliases = collections.reduce((result, collection) => {
    const collectionName = collection.name;
    const modesAmount = collection.modes.length;

    collection.modes.forEach((mode, index) => {
      const modeName = mode.name;

      variables.forEach((variable) => {
        const variableModeId = Object.keys(variable.valuesByMode)[index];

        if (variableModeId === mode.modeId) {
          const aliasPath = getAliasVariableName({
            collectionName: collectionName,
            modeName: modeName,
            modesAmount: modesAmount,
            variableName: variable.name,
          });

          result[variable.id] = aliasPath;
        }

        return result;
      });
    });

    return result;
  }, {});

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
          const variableObject = {
            $value: normalizeValue({
              variableValue: variable.valuesByMode[variableModeId],
              variableType: variable.resolvedType,
              colorMode: colorMode,
              allAliases: allAliases,
            }),
            $type: normilizeType(variable.resolvedType),
            $description: variable.description,
            // add scopes if true
            ...(isScopesIncluded && {
              scopes: variable.scopes,
            }),
            // add meta
            $extensions: {
              variableId: variable.id,
              aliasPath: allAliases[variable.id],
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

    // console.log("modes", modes);

    mergedVariables[collectionName] = modes;
  });

  return mergedVariables;
};
