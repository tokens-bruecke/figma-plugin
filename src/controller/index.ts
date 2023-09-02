import { checkForVariables } from "../utils/controller/checkForVariables";
import { getStorageConfig } from "../utils/controller/getStorageConfig";

import { stylesToTokens } from "../utils/styles/stylesToTokens";

import { variablesToTokens } from "../utils/variablesToTokens";
import { mergeStylesIntoTokens } from "../utils/mergeStylesIntoTokens";

// import { removeDollarSign } from "../utils/removeDollarSign";

import { config } from "../utils/config";

// clear console on reload
console.clear();

////////////////////////
// EXPORT TOKENS ///////
////////////////////////

const pluginConfigKey = "tokenbrücke-config";

getStorageConfig(pluginConfigKey);

//
let isCodePreviewOpen = false;

const frameWidthWithCodePreview = 800;
const frameWidth = isCodePreviewOpen
  ? frameWidthWithCodePreview
  : config.frameWidth;

figma.showUI(__html__, {
  width: frameWidth,
  height: 600,
  themeColors: true,
});

let JSONSettingsConfig: JSONSettingsConfigI;

const getTokens = async () => {
  const variableCollection =
    figma.variables.getLocalVariableCollections() as VariableCollection[];
  const variables = figma.variables.getLocalVariables() as Variable[];

  // convert variables to tokens
  const variableTokens = await variablesToTokens(
    variables,
    variableCollection,
    JSONSettingsConfig
  );

  // convert styles to tokens
  const styleTokens = await stylesToTokens({
    includedStyles: JSONSettingsConfig.includedStyles,
    colorMode: JSONSettingsConfig.colorMode,
    isDTCGForamt: JSONSettingsConfig.useDTCGKeys,
  });

  // merge variables and styles
  const mergedVariables = mergeStylesIntoTokens(
    variableTokens,
    styleTokens,
    JSONSettingsConfig.selectedCollection
  );

  // add meta to mergedVariables
  const metaData = {
    useDTCGKeys: JSONSettingsConfig.useDTCGKeys,
    colorMode: JSONSettingsConfig.colorMode,
    variableCollections: JSONSettingsConfig.variableCollections,
    createdAt: new Date().toISOString(),
  } as MetaPropsI;

  // add meta to mergedVariables
  mergedVariables["$meta"] = metaData;

  // console.log("mergedVariables", mergedVariables);

  return mergedVariables;
};

// listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  await checkForVariables(msg.type);

  // get JSON settings config from UI and store it in a variable
  if (msg.type === "JSONSettingsConfig") {
    // update JSONSettingsConfig
    JSONSettingsConfig = msg.config;

    // console.log("updated JSONSettingsConfig received", JSONSettingsConfig);

    // handle client storage
    await figma.clientStorage.setAsync(
      pluginConfigKey,
      JSON.stringify(JSONSettingsConfig)
    );
  }

  // generate tokens and send them to the UI
  if (msg.type === "getTokens") {
    await getTokens().then((tokens) => {
      figma.ui.postMessage({
        type: "setTokens",
        tokens: tokens,
        role: msg.role,
        server: msg.server,
      } as TokensMessageI);
    });
  }

  // change size of UI
  if (msg.type === "resizeUIHeight") {
    figma.ui.resize(frameWidth, msg.height);
  }

  if (msg.type === "openCodePreview") {
    console.log("openCodePreview", msg.isCodePreviewOpen);

    isCodePreviewOpen = msg.isCodePreviewOpen;
    figma.ui.resize(frameWidthWithCodePreview, msg.height);
  }
};
