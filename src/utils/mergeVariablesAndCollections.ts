type variableTypes = VariableResolvedDataType | VariableAlias["type"];

interface CleanedVariable {
  name: string;
  value: string;
  type: variableTypes;
  description: string;
}

interface CleanedVariableObject {
  [key: string]: CleanedVariable;
}

// const getVariableNameById = (id: string, variables: Variable[]) => {
//   const variable = variables.find((variable) => variable.id === id);

//   if (variable && variable.name) {
//     const parts = variable.name.split("/");
//     const aliasVariableName = `{${parts.join(".")}}`;

//     return aliasVariableName;
//   }

//   return null; // Return null if no variable is found or no name is available
// };

// const ifValueIsAlias = (value: any, variables: Variable[]) => {
//   // if it's an object, we assume it's an alias
//   const variableName = getVariableNameById(value.id, variables);

//   if (variableName) {
//     return variableName;
//   }

//   return value;
// };

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
            value: variable.value,
            type: variable.type,
            description: variable.description,
          };
        } else {
          currentLevel[part] = {};
          currentLevel = {
            ...currentLevel[part],
          };
        }
      } else {
        currentLevel = currentLevel[part];
      }
    });
  });

  return dictionary;
};

export const mergeVariablesAndCollections = (
  variables: Variable[],
  collections: VariableCollection[]
) => {
  let mergedVariables = {}; // Initialize the mergedVariables object

  collections.forEach((collection) => {
    let modes = {}; // Initialize the modes object for each collection

    collection.modes.forEach((mode, index) => {
      let variablesForMode = {}; // Initialize the variablesForMode object for each mode

      // Loop through all variables
      variables.forEach((variable) => {
        const variableModeId = Object.keys(variable.valuesByMode)[index];

        if (variableModeId === mode.modeId) {
          const variableObject = {
            name: variable.name,
            value: variable.valuesByMode[variableModeId],
            type: variable.resolvedType,
            description: variable.description,
          } as CleanedVariable;

          variablesForMode[variable.name] = variableObject; // Add variable to variablesForMode using its name as the key
        }
      });

      // Check if there's only one mode
      if (collection.modes.length === 1) {
        modes = convertVariablesToDictionary(variablesForMode); // Assign variablesForMode directly to modes when there's only one mode
      } else {
        modes[mode.name] = convertVariablesToDictionary(variablesForMode);
      }
    });

    mergedVariables[collection.name] = modes; // Add modes to mergedVariables using collection name as the key
  });

  return mergedVariables; // Return the final mergedVariables object
};
