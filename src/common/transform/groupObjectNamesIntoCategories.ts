export const groupObjectNamesIntoCategories = (inputObject: any) => {
  const result = {};

  for (const key in inputObject) {
    const parts = key.split("/");
    let current = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (i === parts.length - 1) {
        // Check if the value is an array, if so, assign the whole array as is
        if (Array.isArray(inputObject[key])) {
          current[part] = inputObject[key];
        } else {
          current[part] = inputObject[key];
        }
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  }

  for (const prop in result) {
    if (typeof result[prop] === "object" && !Array.isArray(result[prop])) {
      result[prop] = groupObjectNamesIntoCategories(result[prop]);
    }
  }

  return result;
};
