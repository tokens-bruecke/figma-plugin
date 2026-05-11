import { parseStoredConfig } from './storageConfig';

export const getStorageConfig = async (key) => {
  const rawStorageConfig = await figma.clientStorage.getAsync(key);
  const config = parseStoredConfig(rawStorageConfig);

  await figma.clientStorage.setAsync(key, JSON.stringify(config));

  figma.ui.postMessage({
    type: 'storageConfig',
    storageConfig: config,
  });
};
