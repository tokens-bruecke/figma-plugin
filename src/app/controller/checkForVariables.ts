export const checkForVariables = async (msgType) => {
  // get and set collections
  if (msgType === "checkForVariables") {
    const variables = figma.variables.getLocalVariables() as Variable[];
    const variableCollections =
      figma.variables.getLocalVariableCollections() as VariableCollection[];
    const collectionNames = variableCollections.map((collection) => {
      return collection.name;
    });

    console.log("available variables", variables.length);
    console.log("available variable collections", variableCollections.length);

    figma.ui.postMessage({
      type: "checkForVariables",
      hasVariables: variables.length > 0,
      variableCollections: collectionNames,
    });
  }
};
