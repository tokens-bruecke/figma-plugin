import { checkForVariables } from './checkForVariables';
import { getStorageConfig } from './getStorageConfig';

// import { removeDollarSign } from "../utils/removeDollarSign";

import { config } from './config';
import { getTokens } from '@common/export';
import { tokensToVariables } from '@common/transform/tokensToVariables';
import { PluginAPIResolver } from '@app/api/pluginApiResolver';
import {
  sanitizeMultiTenantConfig,
  updateActiveProfile,
} from './storageConfig';

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
const minFrameWidthWithCodePreview = 540;
let codePreviewWidth = frameWidthWithCodePreview;
let frameHeight = 600;
const frameWidth = isCodePreviewOpen ? codePreviewWidth : config.frameWidth;

figma.showUI(__html__, {
  width: frameWidth,
  height: frameHeight,
  themeColors: true,
});

let JSONSettingsConfig: JSONSettingsConfigI;
let multiTenantConfig: MultiTenantConfigI;

// listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  await checkForVariables(msg.type);

  // get JSON settings config from UI and store it in a variable
  if (msg.type === 'JSONSettingsConfig') {
    multiTenantConfig = sanitizeMultiTenantConfig(msg.config);

    JSONSettingsConfig =
      multiTenantConfig.profiles[multiTenantConfig.activeProfileId];

    await figma.clientStorage.setAsync(
      pluginConfigKey,
      JSON.stringify(multiTenantConfig)
    );
  }

  if (msg.type === 'activeProfileConfig') {
    if (!multiTenantConfig) {
      return;
    }

    multiTenantConfig = updateActiveProfile(multiTenantConfig, msg.config);
    JSONSettingsConfig =
      multiTenantConfig.profiles[multiTenantConfig.activeProfileId];

    await figma.clientStorage.setAsync(
      pluginConfigKey,
      JSON.stringify(multiTenantConfig)
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

  // import tokens and create variables
  if (msg.type === 'importTokens') {
    console.log('Importing tokens...', msg.tokens);

    try {
      const result = await tokensToVariables(
        msg.tokens,
        new PluginAPIResolver()
      );

      console.log('Import result:', result);

      // Send result back to UI
      figma.ui.postMessage({
        type: 'importResult',
        tokens: null,
        role: 'import',
        server: [],
        result: result,
      } as TokensMessageI);

      // Refresh the collections list if import was successful
      if (result.success) {
        await checkForVariables('checkForVariables');
      }
    } catch (error) {
      console.error('Import error:', error);

      figma.ui.postMessage({
        type: 'importResult',
        tokens: null,
        role: 'import',
        server: [],
        result: {
          success: false,
          message: `Import failed: ${error.message}`,
          collectionsCreated: 0,
          variablesCreated: 0,
          errors: [error.message],
        },
      } as TokensMessageI);
    }
  }

  // change size of UI
  if (msg.type === 'resizeUIHeight') {
    const currentWidth = isCodePreviewOpen
      ? codePreviewWidth
      : config.frameWidth;
    frameHeight = Math.round(msg.height);
    figma.ui.resize(currentWidth, frameHeight);
  }

  if (msg.type === 'resizeUIWidth') {
    codePreviewWidth = Math.max(
      minFrameWidthWithCodePreview,
      Math.round(msg.width)
    );

    if (isCodePreviewOpen) {
      figma.ui.resize(codePreviewWidth, frameHeight);
    }
  }

  if (msg.type === 'resetUIWidth') {
    codePreviewWidth = frameWidthWithCodePreview;

    if (isCodePreviewOpen) {
      figma.ui.resize(codePreviewWidth, frameHeight);
    }
  }

  if (msg.type === 'openCodePreview') {
    isCodePreviewOpen = msg.isCodePreviewOpen;
    const nextWidth = isCodePreviewOpen ? codePreviewWidth : config.frameWidth;
    frameHeight = Math.round(msg.height);
    figma.ui.resize(nextWidth, frameHeight);
  }
};
