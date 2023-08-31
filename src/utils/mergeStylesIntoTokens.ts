export const mergeStylesIntoTokens = (
  variableTokens: any,
  styleTokens: any,
  selectedCollection: string
) => {
  if (selectedCollection === "none") {
    // Object.assign(variableTokens, styleTokens);
    styleTokens.forEach((styleToken) => {
      Object.assign(variableTokens, styleToken);
    });
  }

  if (selectedCollection !== "none") {
    // Object.assign(variableTokens[selectedCollection], styleTokens);
    styleTokens.forEach((styleToken) => {
      Object.assign(variableTokens[selectedCollection], styleToken);
    });
  }

  // console.log("variableTokens", variableTokens);

  return variableTokens;
};
