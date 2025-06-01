import { checkForVariables } from './checkForVariables';
import { getStorageConfig } from './getStorageConfig';

// import { removeDollarSign } from "../utils/removeDollarSign";

import { config } from './config';
import { getTokens } from '../../common/export';
import { PluginAPIResolver } from '../api/pluginApiResolver';

// clear console on reload
console.clear();

////////////////////////
// EXPORT TOKENS ///////
////////////////////////

const pluginConfigKey = 'tokenbrücke-config';

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

// listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  await checkForVariables(msg.type);

  // get JSON settings config from UI and store it in a variable
  if (msg.type === 'JSONSettingsConfig') {
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
  if (msg.type === 'getTokens') {
    await getTokens(
      new PluginAPIResolver(),
      JSONSettingsConfig,
      JSONSettingsConfig
    ).then((tokens) => {
      figma.ui.postMessage({
        type: 'setTokens',
        tokens: tokens,
        role: msg.role,
        server: msg.server,
      } as TokensMessageI);
    });
  }

  // change size of UI
  if (msg.type === 'resizeUIHeight') {
    figma.ui.resize(frameWidth, Math.round(msg.height));
  }

  if (msg.type === 'openCodePreview') {
    console.log('openCodePreview', msg.isCodePreviewOpen);

    isCodePreviewOpen = msg.isCodePreviewOpen;
    figma.ui.resize(frameWidthWithCodePreview, Math.round(msg.height));
  }
};
