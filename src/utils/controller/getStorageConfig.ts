export const getStorageConfig = async (key) => {
  // clear storage for testing
  // figma.clientStorage.setAsync(key, null);

  figma.clientStorage.getAsync(key).then((storageConfig) => {
    try {
      console.log("storageConfig", storageConfig);

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
