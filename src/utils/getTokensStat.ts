import { countTokens } from "./countTokens";

export const getTokensStat = (tokens) => {
  // get lines count
  const codeLines = JSON.stringify(tokens, null, 2).split("\n").length;

  console.log("codeLines", codeLines);
  // get groups count
  const groupsCount = Object.keys(tokens).reduce((acc, key) => {
    const group = tokens[key];
    const groupKeys = Object.keys(group);

    return acc + groupKeys.length;
  }, 0);

  const tokensCount = countTokens(tokens);

  // count size in bytes
  const size = new TextEncoder().encode(JSON.stringify(tokens)).length;

  return {
    codeLines,
    groupsCount,
    tokensCount,
    size,
  };
};
