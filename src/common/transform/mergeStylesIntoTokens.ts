export const mergeStylesIntoTokens = (
  variableTokens: any,
  styleTokens: any,
  storeStyleInCollection: string
) => {
  if (!storeStyleInCollection || storeStyleInCollection === "none") {
    // Object.assign(variableTokens, styleTokens);
    styleTokens.forEach((styleToken) => {
      Object.assign(variableTokens, styleToken);
    });
  } else {
    // Object.assign(variableTokens[storeStyleInCollection], styleTokens);
    styleTokens.forEach((styleToken) => {
      Object.assign(variableTokens[storeStyleInCollection], styleToken);
    });
  }

  // console.log("variableTokens", variableTokens);

  return variableTokens;
};
