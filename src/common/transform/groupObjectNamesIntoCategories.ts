export const groupObjectNamesIntoCategories = (inputObject: any) => {
  const result = {};

  for (const key in inputObject) {
    const parts = key.split('/');
    let current = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (i === parts.length - 1) {
        const existing = current[part];
        const value = inputObject[key];

        if (
          existing &&
          typeof existing === 'object' &&
          !Array.isArray(existing) &&
          value &&
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {
          // A group with this name was already created (e.g. a variable named
          // "border/brand" alongside "border/brand/subtle"). Merge the token
          // into the existing group instead of overwriting it, so sibling
          // tokens are not silently dropped.
          current[part] = { ...value, ...existing };
        } else {
          current[part] = value;
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
    if (typeof result[prop] === 'object' && !Array.isArray(result[prop])) {
      result[prop] = groupObjectNamesIntoCategories(result[prop]);
    }
  }

  return result;
};
