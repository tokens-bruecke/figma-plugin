export const findByVariableId = (obj, variableId) => {
  for (const key in obj) {
    if (typeof obj[key] === "object") {
      if (
        obj[key].$extensions &&
        obj[key].$extensions.variableId === variableId
      ) {
        return obj[key];
      } else {
        const result = findByVariableId(obj[key], variableId);
        if (result) {
          return result as PluginTokenI;
        }
      }
    }
  }

  return null;
};
