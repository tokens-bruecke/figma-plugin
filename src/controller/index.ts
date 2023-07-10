import { checkForVariables } from "../utils/controller/checkForVariables";
import { getStorageConfig } from "../utils/controller/getStorageConfig";

import { textStylesToTokens } from "../utils/styles/textStylesToTokens";
import { gridStylesToTokens } from "../utils/styles/gridStylesToTokens";
import { effectStylesToTokens } from "../utils/styles/effectStylesToTokens";

import { generateTokens } from "../utils/generateTokens";

// clear console on reload
console.clear();

const pluginConfigKey = "tokenbrücke-config";

getStorageConfig(pluginConfigKey);

if (figma.command === "export") {
  figma.showUI(__uiFiles__["export"], {
    width: 300,
    height: 700,
    themeColors: true,
  });

  let JSONSettingsConfig: JSONSettingsConfigI;

  const getTokens = async () => {
    const variableCollection =
      figma.variables.getLocalVariableCollections() as VariableCollection[];
    const variables = figma.variables.getLocalVariables() as Variable[];

    let styleTokens = [];

    // Extract text tokens
    if (JSONSettingsConfig.includeStyles.text.isIncluded) {
      const textTokens = await textStylesToTokens(
        JSONSettingsConfig.includeStyles.text.customName
      );

      styleTokens.push(textTokens);
    }

    // Extract grid tokens
    if (JSONSettingsConfig.includeStyles.grids.isIncluded) {
      const gridTokens = await gridStylesToTokens(
        JSONSettingsConfig.includeStyles.grids.customName
      );

      styleTokens.push(gridTokens);
    }

    // Extract effect tokens
    if (JSONSettingsConfig.includeStyles.effects.isIncluded) {
      const effectTokens = await effectStylesToTokens(
        JSONSettingsConfig.includeStyles.effects.customName,

        JSONSettingsConfig.colorMode
      );

      styleTokens.push(effectTokens);
    }

    const mergedVariables = await generateTokens(
      variables,
      variableCollection,
      styleTokens,
      JSONSettingsConfig
    );

    return mergedVariables;
  };

  // listen for messages from the UI
  figma.ui.onmessage = async (msg) => {
    await checkForVariables(msg.type);

    // get JSON settings config from UI and store it in a variable
    if (msg.type === "JSONSettingsConfig") {
      // update JSONSettingsConfig
      JSONSettingsConfig = msg.config;

      console.log("JSONSettingsConfig controller", JSONSettingsConfig);

      // handle client storage
      await figma.clientStorage.setAsync(
        pluginConfigKey,
        JSON.stringify(JSONSettingsConfig)
      );
    }

    // generate tokens and send them to the UI
    if (msg.type === "generateTokens") {
      if (msg.role === "preview") {
        await getTokens().then((tokens) => {
          figma.ui.postMessage({
            type: "tokens",
            role: "preview",
            tokens: tokens,
          });
        });
      }
    }
  };
}

if (figma.command === "import") {
  // show notification
  figma.notify("Importing tokens from JSON file...");
}
