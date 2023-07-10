export const getStorageConfig = async (key) => {
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
