import { normalizeValue } from "./normalizeValue";
import { normilizeType } from "./normilizeType";
import { transformNameConvention } from "./transformNameConvention";

// console.clear();

interface CleanedVariable {
  name: string;
  value: string;
  type: tokenType;
  description: string;
  scopes?: VariableScope[];
}

interface CleanedVariableObject {
  [key: string]: CleanedVariable;
}

const convertVariablesToDictionary = (variables: CleanedVariableObject) => {
  const dictionary = {};

  Object.keys(variables).forEach((key) => {
    const variable = variables[key];
    const parts = variable.name.split("/");
    let currentLevel = dictionary;

    parts.forEach((part, index) => {
      if (!currentLevel[part]) {
        if (index === parts.length - 1) {
          currentLevel[part] = {
            $value: variable.value,
            $type: variable.type,
            $description: variable.description,
            ...(variable.scopes && { scopes: variable.scopes }),
          };
        } else {
          currentLevel[part] = {};
        }
      }
      currentLevel = currentLevel[part];
    });
  });

  return dictionary;
};

export const generateTokens = (
  variables: Variable[],
  collections: VariableCollection[],
  JSONSettingsConfig: JSONSettingsConfigI
) => {
  const mergedVariables = {};

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

      const variablesForMode = variables.reduce((result, variable) => {
        const variableModeId = Object.keys(variable.valuesByMode)[index];

        const variableName = transformNameConvention(
          variable.name,
          JSONSettingsConfig.namesTransform
        );

        if (variableModeId === mode.modeId) {
          const variableObject: CleanedVariable = {
            name: variableName,
            value: normalizeValue(
              variable.valuesByMode[variableModeId],
              variable.resolvedType,
              variables,
              `${collectionName}.${modeName}`
            ),
            type: normilizeType(variable.resolvedType),
            description: variable.description,
            // add scopes if true
            ...(JSONSettingsConfig.includeScopes && {
              scopes: variable.scopes,
            }),
          };

          result[variableName] = variableObject;
        }

        return result;
      }, {});

      // check amount of modes
      if (collection.modes.length === 1) {
        Object.assign(modes, convertVariablesToDictionary(variablesForMode));
      } else {
        modes[modeName] = convertVariablesToDictionary(variablesForMode);
      }
    });

    mergedVariables[collectionName] = modes;
  });

  return mergedVariables;
};
