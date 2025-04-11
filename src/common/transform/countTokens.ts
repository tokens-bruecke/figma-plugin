export const countTokens = (obj) => {
  let count = 0;

  function traverse(obj) {
    for (let key in obj) {
      if (key === "$value" || key === "value") {
        count++;
      } else if (typeof obj[key] === "object") {
        traverse(obj[key]);
      }
    }
  }

  traverse(obj);
  return count;
};
