// styleTokens: any[],

// // assign style tokens to mergedVariables
// styleTokens.forEach((styleToken) => {
//   // if selectedCollection is "separate" then merge styleTokens with mergedVariables
//   if (JSONSettingsConfig.selectedCollection === "none") {
//     Object.assign(mergedVariables, styleToken);
//   }

//   // if selectedCollection is a collection name then merge styleTokens with mergedVariables[collectionName]
//   if (JSONSettingsConfig.selectedCollection === collectionName) {
//     Object.assign(mergedVariables[collectionName], styleToken);
//   }
// });

export const mergeVaraiblsAndStyleTokens = (
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
