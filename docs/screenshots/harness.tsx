// Renders the real plugin UI in a browser, with a stand-in for the Figma
// side of the postMessage bridge. Open harness.html?scene=<name>&theme=dark.

import React from 'react';
import { createRoot } from 'react-dom/client';

import Container from '@app/container';
import { sanitizeMultiTenantConfig } from '@app/controller/storageConfig';
import { defaultPluginEnvironment } from '@app/pluginEnvironment';
import { getTokens } from '@common/export';
import { FileResolver } from '@cli/fileResolver';

import { demoSnapshot } from './demoSnapshot';
import { scenes } from './scenes.mjs';

import 'react-figma-ui/ui/styles.css';
import 'react-figma-ui/styles/themes.css';
import './harness.css';

const FRAME_WIDTH = 300;
const PREVIEW_WIDTH = 800;

const params = new URLSearchParams(location.search);
const sceneName = params.get('scene') ?? 'settings';
const scene = (scenes as Record<string, any>)[sceneName];
const theme = params.get('theme') === 'dark' ? 'dark' : 'light';

document.body.classList.add(`figma-${theme}`);

const windowEl = document.getElementById('window') as HTMLDivElement;
const frameEl = document.getElementById('frame') as HTMLDivElement;

let multiTenantConfig = sanitizeMultiTenantConfig({
  activeProfileId: scene.activeProfileId ?? 'default',
  profiles: scene.profiles,
} as MultiTenantConfigI);

const resize = (width: number, height: number) => {
  frameEl.style.width = `${width}px`;
  frameEl.style.height = `${height}px`;
};
resize(FRAME_WIDTH, 600);

// Replies land on this same window, and some share the request's type
// (checkForVariables), so they are marked to keep the stand-in from
// answering itself
const reply = (pluginMessage: Record<string, unknown>) =>
  window.postMessage({ pluginMessage, fromHarness: true }, '*');

let isCodePreviewOpen = false;
let frameHeight = 600;

window.addEventListener('message', async (event) => {
  const msg = event.data?.pluginMessage;
  if (!msg || event.data.fromHarness) return;

  switch (msg.type) {
    case 'getStorageConfig':
      reply({ type: 'storageConfig', storageConfig: multiTenantConfig });
      break;

    // The UI waits for this before it renders
    case 'getPluginEnvironment':
      reply({
        type: 'pluginEnvironment',
        environment: scene.environment ?? defaultPluginEnvironment,
      });
      break;

    case 'getSharedProfiles':
      reply({ type: 'sharedProfiles', sharedProfiles: scene.sharedProfiles ?? {} });
      break;

    case 'checkForVariables':
      reply({
        type: 'checkForVariables',
        hasVariables: scene.hasVariables ?? true,
        variableCollections: demoSnapshot.variableCollections.map((c) => c.name),
      });
      break;

    case 'JSONSettingsConfig':
      multiTenantConfig = sanitizeMultiTenantConfig(msg.config);
      break;

    case 'getTokens': {
      const settings =
        multiTenantConfig.profiles[multiTenantConfig.activeProfileId];
      const tokens = await getTokens(
        new FileResolver(demoSnapshot as any, () => {}),
        settings
      );
      reply({ type: 'setTokens', tokens, role: msg.role, server: msg.server });
      break;
    }

    case 'resizeUIHeight':
      frameHeight = Math.round(msg.height);
      resize(isCodePreviewOpen ? PREVIEW_WIDTH : FRAME_WIDTH, frameHeight);
      break;

    case 'openCodePreview':
      isCodePreviewOpen = msg.isCodePreviewOpen;
      frameHeight = scene.previewHeight ?? Math.round(msg.height);
      resize(isCodePreviewOpen ? PREVIEW_WIDTH : FRAME_WIDTH, frameHeight);
      break;
  }
});

// Keep only the rows between `top` and `bottom` (px from the top of the
// plugin frame), fading the edges that cut through the window
(window as any).__crop = (top: number, bottom: number) => {
  const full = frameEl.offsetHeight;
  const titleBar = windowEl.offsetHeight - full;
  const cutTop = top > 0;
  const cutBottom = bottom < full;
  const from = cutTop ? titleBar + top : 0;
  const to = cutBottom ? titleBar + bottom : windowEl.offsetHeight;

  const viewport = document.getElementById('viewport') as HTMLDivElement;
  viewport.style.height = `${to - from}px`;
  windowEl.style.transform = `translateY(${-from}px)`;
  const fade = 32;
  viewport.style.maskImage = `linear-gradient(to bottom, ${
    cutTop ? `transparent, black ${fade}px` : 'black'
  }, ${cutBottom ? `black calc(100% - ${fade}px), transparent` : 'black'})`;
};

createRoot(document.getElementById('react-page')!).render(<Container />);
