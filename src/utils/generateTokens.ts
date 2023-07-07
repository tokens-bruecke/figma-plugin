import { getAndConvertStyles } from "./getAndConvertStyles";

import { normalizeValue } from "./normalizeValue";
import { normilizeType } from "./normilizeType";

import { groupObjectNamesIntoCategories } from "./groupObjectNamesIntoCategories";
import { transformNameConvention } from "./transformNameConvention";

// console.clear();

interface CleanedVariable {
  $value: string;
  $type: tokenType;
  $description: string;
  scopes?: VariableScope[];
}

export const generateTokens = async (
  variables: Variable[],
  collections: VariableCollection[],
  JSONSettingsConfig: JSONSettingsConfigI
) => {
  const mergedVariables = {};
  // Extract style tokens
  const styleTokens = await getAndConvertStyles(
    JSONSettingsConfig.includeStyles,
    JSONSettingsConfig.colorMode
  );

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

        const variableName = transformNameConvention(
          variable.name,
          JSONSettingsConfig.namesTransform
        );

        if (variableModeId === mode.modeId) {
          const variableObject = {
            // name: variableName,
            $value: normalizeValue(
              variable.valuesByMode[variableModeId],
              variable.resolvedType,
              JSONSettingsConfig.colorMode,
              variables,
              `${collectionName}.${modeName}`
            ),
            $type: normilizeType(variable.resolvedType),
            $description: variable.description,
            // add scopes if true
            ...(JSONSettingsConfig.includeScopes && {
              scopes: variable.scopes,
            }),
          } as CleanedVariable;

          result[variableName] = variableObject;
        }

        return result;
      }, {});

      // check amount of modes and assign to "modes" or "modes[modeName]" variable
      if (collection.modes.length === 1) {
        Object.assign(modes, groupObjectNamesIntoCategories(variablesPerMode));
      } else {
        modes[modeName] = groupObjectNamesIntoCategories(variablesPerMode);
      }
    });

    mergedVariables[collectionName] = modes;
  });

  return mergedVariables;
};
