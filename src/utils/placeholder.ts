export const convertVariablesToDictionary = (variables) => {
  const dictionary = {};

  variables.forEach((variable) => {
    const parts = variable.name.split("/"); // Split the name by '/' to get the hierarchy levels
    let currentLevel = dictionary;

    parts.forEach((part, index) => {
      if (!currentLevel[part]) {
        if (index === parts.length - 1) {
          // If it's the last part, add the variable value directly
          currentLevel[part] = variable.value;
        } else {
          // Otherwise, create a new level in the dictionary
          currentLevel[part] = {};
          currentLevel = currentLevel[part];
        }
      } else {
        currentLevel = currentLevel[part];
      }
    });
  });

  return dictionary;
};
