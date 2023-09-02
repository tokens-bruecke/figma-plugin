export const getStorageConfig = async (key) => {
  // clear storage for testing
  // figma.clientStorage.setAsync(key, null);

  const storageVersionKey = "bruecke-storage";
  const actualStorageVersion = "v1";

  const storageConfig = await figma.clientStorage.getAsync(storageVersionKey);

  // clear storage if storage version is different
  if (storageConfig && storageConfig !== actualStorageVersion) {
    figma.clientStorage.setAsync(key, null);
    await figma.clientStorage.setAsync(storageVersionKey, actualStorageVersion);
  }

  // get storage config
  figma.clientStorage.getAsync(key).then((storageConfig) => {
    try {
      console.log("storageConfig >>>>", JSON.parse(storageConfig));

      figma.ui.postMessage({
        type: "storageConfig",
        storageConfig: JSON.parse(storageConfig),
      });
    } catch (error) {
      figma.ui.postMessage({
        type: "storageConfig",
        storageConfig: null,
      });
    }
  });
};
