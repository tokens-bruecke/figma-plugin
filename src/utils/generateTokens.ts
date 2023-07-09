import { getAliasVariableName } from "./getAliasVariableName";
import { normalizeValue } from "./normalizeValue";
import { normilizeType } from "./normilizeType";

import { groupObjectNamesIntoCategories } from "./groupObjectNamesIntoCategories";
import { transformNameConvention } from "./transformNameConvention";

// console.clear();

export const generateTokens = async (
  variables: Variable[],
  collections: VariableCollection[],
  styleTokens: any[],
  JSONSettingsConfig: JSONSettingsConfigI
) => {
  const mergedVariables = {};

  console.log("styleTokens", styleTokens);

  collections.forEach((collection) => {
    let modes = {};

    const collectionName = transformNameConvention(
      collection.name,
      JSONSettingsConfig.namesTransform
    );

    collection.modes.forEach((mode, index) => {
      const modeName = transformNameConvention(
        mode.name,
        JSONSettingsConfig.namesTransform
      );

      const variablesPerMode = variables.reduce((result, variable) => {
        const variableModeId = Object.keys(variable.valuesByMode)[index];

        if (variableModeId === mode.modeId) {
          const aliasPath = getAliasVariableName(
            `${collectionName}.${modeName}`,
            variable.name
          );
          const variableObject = {
            $value: normalizeValue(
              variable.valuesByMode[variableModeId],
              variable.resolvedType,
              JSONSettingsConfig.colorMode,
              variables,
              aliasPath
            ),
            $type: normilizeType(variable.resolvedType),
            $description: variable.description,
            // add scopes if true
            ...(JSONSettingsConfig.includeScopes && {
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
      if (collection.modes.length === 1) {
        Object.assign(
          modes,
          groupObjectNamesIntoCategories(
            variablesPerMode,
            JSONSettingsConfig.namesTransform
          )
        );
      } else {
        modes[modeName] = groupObjectNamesIntoCategories(
          variablesPerMode,
          JSONSettingsConfig.namesTransform
        );
      }
    });

    mergedVariables[collectionName] = modes;

    // assign style tokens to mergedVariables
    styleTokens.forEach((styleToken) => {
      Object.assign(mergedVariables, styleToken);
    });
  });

  return mergedVariables;
};
