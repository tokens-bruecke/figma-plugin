import { normalizeValue } from "./normalizeValue";
import { normilizeType } from "./normilizeType";
import { getTokenKeyName } from "./getTokenKeyName";

import { groupObjectNamesIntoCategories } from "./groupObjectNamesIntoCategories";

// console.clear();

export const variablesToTokens = async (
  variables: Variable[],
  collections: VariableCollection[],
  JSONSettingsConfig: JSONSettingsConfigI
) => {
  const colorMode = JSONSettingsConfig.colorMode;
  const isDTCGForamt = JSONSettingsConfig.useDTCGKeys;
  const includeValueAliasString = JSONSettingsConfig.includeValueAliasString;
  const keyNames = getTokenKeyName(isDTCGForamt);

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

        // console.log("variable", variable);

        if (variableModeId === mode.modeId) {
          const variableObject = {
            [keyNames.type]: normilizeType(variable.resolvedType),
            [keyNames.value]: normalizeValue({
              modeName,
              modesAmount,
              variableType: variable.resolvedType,
              variableValue: variable.valuesByMode[variableModeId],
              colorMode,
              isDTCGForamt,
              includeValueAliasString,
            }),
            [keyNames.description]: variable.description,
            // add scopes if true
            ...(isScopesIncluded && {
              scopes: variable.scopes,
            }),
            // add meta
            $extensions: {
              variableId: variable.id,
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
