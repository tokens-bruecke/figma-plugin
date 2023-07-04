import { generateTokens } from "../utils/generateTokens";

// clear console on reload
console.clear();

// default plugin size
const pluginFrameSize = {
  width: 300,
  height: 670,
};

// show plugin UI
figma.showUI(__html__, pluginFrameSize);

let JSONSettingsConfig: JSONSettingsConfigI;

const getTokens = async () => {
  const variableCollection =
    figma.variables.getLocalVariableCollections() as VariableCollection[];
  const variables = figma.variables.getLocalVariables() as Variable[];

  const mergedVariables = generateTokens(
    variables,
    variableCollection,
    JSONSettingsConfig
  );

  return mergedVariables;
};

// console.log(mergedVariables);
// const JSONToTokens = variablesToTokens(variables);
// console.log(JSONToTokens);

// listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  // get JSON settings config from UI and store it in a variable
  if (msg.type === "JSONSettingsConfig") {
    JSONSettingsConfig = msg.config;

    console.log("JSONSettingsConfig", JSONSettingsConfig);
  }

  // generate tokens and send them to the UI
  if (msg.type === "generateTokens") {
    await getTokens().then((mergedVariables) => {
      figma.ui.postMessage({
        type: "tokens",
        tokens: mergedVariables,
      });
    });
  }
};
