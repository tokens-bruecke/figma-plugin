export const checkForVariables = async (msgType) => {
  // get and set collections
  if (msgType === "checkForVariables") {
    const variables = figma.variables.getLocalVariables() as Variable[];

    console.log("variables", variables.length);

    figma.ui.postMessage({
      type: "checkForVariables",
      hasVariables: variables.length > 0,
    });
  }
};
