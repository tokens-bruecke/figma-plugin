import { checkForVariables } from "../utils/controller/checkForVariables";
import { getStorageConfig } from "../utils/controller/getStorageConfig";

import { textStylesToTokens } from "../utils/styles/textStylesToTokens";
import { gridStylesToTokens } from "../utils/styles/gridStylesToTokens";
import { effectStylesToTokens } from "../utils/styles/effectStylesToTokens";

import { generateTokens } from "../utils/generateTokens";
import { removeDollarSign } from "../utils/removeDollarSign";

// clear console on reload
console.clear();

const baseFrameWidth = 300;

if (figma.command === "export") {
  const pluginConfigKey = "tokenbrücke-config";

  getStorageConfig(pluginConfigKey);

  //
  let isCodePreviewOpen = false;

  const frameWidthWithCodePreview = 800;
  const frameWidth = isCodePreviewOpen
    ? frameWidthWithCodePreview
    : baseFrameWidth;

  figma.showUI(__uiFiles__["export"], {
    width: 300,
    height: 0,
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
        const isDTCGKeys = JSONSettingsConfig.useDTCGKeys;
        const updatedTokens = isDTCGKeys ? tokens : removeDollarSign(tokens);

        figma.ui.postMessage({
          type: "setTokens",
          tokens: updatedTokens,
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
}

if (figma.command === "import") {
  figma.showUI(__uiFiles__["import"], {
    width: 300,
    height: 0,
    themeColors: true,
  });

  figma.ui.onmessage = async (msg) => {
    // change size of UI
    if (msg.type === "resizeUIHeight") {
      figma.ui.resize(baseFrameWidth, msg.height);
    }
  };
}
