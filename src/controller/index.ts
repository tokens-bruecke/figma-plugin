import { mergeVariablesAndCollections } from "../utils/mergeVariablesAndCollections";

// clear console on reload
console.clear();

// default plugin size
const pluginFrameSize = {
  width: 300,
  height: 670,
};

// show plugin UI
figma.showUI(__html__, pluginFrameSize);

const variableCollection =
  figma.variables.getLocalVariableCollections() as VariableCollection[];
const variables = figma.variables.getLocalVariables() as Variable[];

console.log("variableCollection", variableCollection);
console.log("variables", variables);

const mergedVariables = mergeVariablesAndCollections(
  variables,
  variableCollection
);

console.log(mergedVariables);

// const JSONToTokens = variablesToTokens(variables);

// console.log(JSONToTokens);

// listen for messages from the UI
// figma.ui.onmessage = async (msg) => {
//   if (msg.type === "string-transform-config") {
//     init();
//   }
// };
