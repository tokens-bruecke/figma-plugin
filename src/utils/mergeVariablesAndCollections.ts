import { normalizeValue } from "./normalizeValue";
import { normilizeType } from "./normilizeType";

// console.clear();

interface CleanedVariable {
  name: string;
  value: string;
  type: tokenType;
  description: string;
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

export const mergeVariablesAndCollections = (
  variables: Variable[],
  collections: VariableCollection[]
) => {
  const mergedVariables = {};

  collections.forEach((collection) => {
    const modes = {};

    collection.modes.forEach((mode, index) => {
      const variablesForMode = variables.reduce((result, variable) => {
        const variableModeId = Object.keys(variable.valuesByMode)[index];

        if (variableModeId === mode.modeId) {
          const variableObject: CleanedVariable = {
            name: variable.name,
            value: normalizeValue(
              variable.valuesByMode[variableModeId],
              variable.resolvedType,
              variables,
              `${collection.name}.${mode.name}`
            ),
            type: normilizeType(variable.resolvedType),
            description: variable.description,
          };

          result[variable.name] = variableObject;
        }

        return result;
      }, {});

      // check amount of modes
      if (collection.modes.length === 1) {
        Object.assign(modes, convertVariablesToDictionary(variablesForMode));
      } else {
        modes[mode.name] = convertVariablesToDictionary(variablesForMode);
      }
    });

    mergedVariables[collection.name] = modes;
  });

  return mergedVariables;
};
