import { parseStoredConfig } from './storageConfig';

export const getStorageConfig = async (key) => {
  const storageVersionKey = 'bruecke-storage';
  const actualStorageVersion = 'v2';

  const storageVersion = await figma.clientStorage.getAsync(storageVersionKey);
  const rawStorageConfig = await figma.clientStorage.getAsync(key);
  const { config: parsedStorageConfig, didMigrate } =
    parseStoredConfig(rawStorageConfig);

  // Persist normalized storage for migration and consistency.
  if (storageVersion !== actualStorageVersion || didMigrate) {
    await figma.clientStorage.setAsync(
      key,
      JSON.stringify(parsedStorageConfig)
    );
    await figma.clientStorage.setAsync(storageVersionKey, actualStorageVersion);
  }

  figma.ui.postMessage({
    type: 'storageConfig',
    storageConfig: parsedStorageConfig,
  });
};
