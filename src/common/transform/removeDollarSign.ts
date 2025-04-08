export const removeDollarSign = (obj: any) => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeDollarSign);
  }

  const result = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      let newKey = key;

      if (
        key.startsWith("$") &&
        ["value", "type", "description", "extensions"].includes(key.slice(1))
      ) {
        newKey = key.slice(1);
      }

      result[newKey] = removeDollarSign(obj[key]);
    }
  }

  return result;
};
