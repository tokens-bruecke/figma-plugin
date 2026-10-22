import { checkForVariables } from './checkForVariables';
import { getStorageConfig } from './getStorageConfig';

import { config } from './config';
import { getTokens } from '@common/export';
import { tokensToVariables } from '@common/transform/tokensToVariables';
import { PluginAPIResolver } from '@app/api/pluginApiResolver';
import { sanitizeMultiTenantConfig } from './storageConfig';

// clear console on reload
console.clear();

////////////////////////
// EXPORT TOKENS ///////
////////////////////////

const pluginConfigKey = 'tokenbrücke-config';

//
let isCodePreviewOpen = false;

const frameWidthWithCodePreview = 800;
const minFrameWidthWithCodePreview = 540;
let codePreviewWidth = frameWidthWithCodePreview;
let frameHeight = 600;
const frameWidth = isCodePreviewOpen ? codePreviewWidth : config.frameWidth;

const environment: PluginEnvironmentI = {
  editorType: figma.editorType,
  mode: figma.mode,
  isVSCode: !!figma.vscode,
};

// Dev Mode is read-only and shows the UI in the Inspect panel, which fills
// the panel and is sized by the user, not by the plugin
const isDevMode = environment.editorType === 'dev';

const resizeUI = (width: number, height: number) => {
  if (isDevMode) return;

  figma.ui.resize(width, height);
};

// Size is ignored in the Inspect panel
figma.showUI(__html__, {
  width: frameWidth,
  height: frameHeight,
  themeColors: true,
});

let JSONSettingsConfig: JSONSettingsConfigI;
let multiTenantConfig: MultiTenantConfigI;

const loadStorageConfig = async () => {
  multiTenantConfig = await getStorageConfig(pluginConfigKey);
  JSONSettingsConfig =
    multiTenantConfig.profiles[multiTenantConfig.activeProfileId];
};

loadStorageConfig();

// listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  await checkForVariables(msg.type);

  if (msg.type === 'getPluginEnvironment') {
    figma.ui.postMessage({ type: 'pluginEnvironment', environment });
  }

  // Links in the UI open through Figma: in Figma for VS Code a plain
  // target="_blank" link does nothing
  if (msg.type === 'openExternal' && /^https?:\/\//.test(msg.url)) {
    figma.openExternal(msg.url);
  }

  // UI asks for the stored config once it is ready to receive it
  if (msg.type === 'getStorageConfig') {
    await loadStorageConfig();
  }

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

  // generate tokens and send them to the UI
  if (msg.type === 'getTokens') {
    try {
      const tokens = await getTokens(
        new PluginAPIResolver(),
        JSONSettingsConfig
      );

      figma.ui.postMessage({
        type: 'setTokens',
        tokens: tokens,
        role: msg.role,
        server: msg.server,
      } as TokensMessageI);
    } catch (error) {
      // Without a reply the UI would wait forever (download, preview, push)
      console.error('Export error:', error);

      figma.ui.postMessage({
        type: 'tokensError',
        tokens: null,
        role: msg.role,
        server: msg.server ?? [],
        message: error?.message ?? String(error),
      } as TokensMessageI);
    }
  }

  // import tokens and create variables
  if (msg.type === 'importTokens') {
    console.log('Importing tokens...', msg.tokens);

    try {
      // The UI hides the import in Dev Mode. Creating variables would throw
      // there anyway: every document write is blocked, even with edit access
      if (isDevMode) {
        throw new Error(
          'Variables can only be imported in Figma Design, not in Dev Mode.'
        );
      }

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
          composedColorsRejected: 0,
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
    resizeUI(currentWidth, frameHeight);
  }

  if (msg.type === 'resizeUIWidth') {
    codePreviewWidth = Math.max(
      minFrameWidthWithCodePreview,
      Math.round(msg.width)
    );

    if (isCodePreviewOpen) {
      resizeUI(codePreviewWidth, frameHeight);
    }
  }

  if (msg.type === 'resetUIWidth') {
    codePreviewWidth = frameWidthWithCodePreview;

    if (isCodePreviewOpen) {
      resizeUI(codePreviewWidth, frameHeight);
    }
  }

  if (msg.type === 'openCodePreview') {
    isCodePreviewOpen = msg.isCodePreviewOpen;
    const nextWidth = isCodePreviewOpen ? codePreviewWidth : config.frameWidth;
    frameHeight = Math.round(msg.height);
    resizeUI(nextWidth, frameHeight);
  }
};
