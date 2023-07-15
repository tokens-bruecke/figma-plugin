import React, { useState, useEffect } from "react";

import { useDidUpdate } from "../../utils/hooks/useDidUpdate";

import { LoadingView } from "./LoadingView";
import { EmptyView } from "./EmptyView";
import { MainView } from "./MainView";
import { ServerSettingsView } from "./ServerSettingsView";

import styles from "./styles.module.scss";

const Container = () => {
  const wrapperRef = React.useRef(null);

  const [isLoading, setIsLoading] = useState(true);

  const [frameHeight, setFrameHeight] = useState(0);
  const [isCodePreviewOpen, setIsCodePreviewOpen] = useState(false);

  const [currentView, setCurrentView] = useState("main");
  const [fileHasVariables, setFileHasVariables] = useState(false);

  const [JSONsettingsConfig, setJSONsettingsConfig] = useState({
    includeStyles: {
      text: {
        isIncluded: false,
        customName: "Typography",
      },
      effects: {
        isIncluded: false,
        customName: "Effects",
      },
      grids: {
        isIncluded: false,
        customName: "Grids",
      },
    },
    variableCollections: [],
    selectedCollection: "none",
    colorMode: "hex",
    includeScopes: false,
    useDTCGKeys: false,
    servers: {
      jsonbin: {
        isEnabled: false,
        id: "",
        name: "",
        secretKey: "",
      },
      github: {
        isEnabled: false,
        token: "",
        repo: "",
        branch: "",
        fileName: "",
        owner: "",
        commitMessage: "",
      },
      customURL: {
        isEnabled: false,
        url: "",
        method: "POST",
        headers: "",
      },
    },
  } as JSONSettingsConfigI);

  const commonProps = {
    JSONsettingsConfig,
    setJSONsettingsConfig,
    setCurrentView,
  };

  //////////////////////
  // HANDLE FUNCTIONS //
  //////////////////////

  /////////////////
  // USE EFFECTS //
  /////////////////

  // Get all collections from Figma
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: "checkForVariables" } }, "*");

    window.onmessage = (event) => {
      const { type, hasVariables, variableCollections, storageConfig } =
        event.data.pluginMessage;

      // check if file has variables
      if (type === "checkForVariables") {
        setFileHasVariables(hasVariables);
        setIsLoading(false);

        if (hasVariables) {
          setJSONsettingsConfig((prev) => ({
            ...prev,
            variableCollections,
          }));
        }
      }

      // check storage on load
      if (type === "storageConfig") {
        console.log("storageConfig <<<<");

        if (storageConfig) {
          setJSONsettingsConfig(storageConfig);
        }
      }
    };
  }, []);

  // Check if the view was changed
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      const { height } = entries[0].contentRect;
      setFrameHeight(height);

      if (isCodePreviewOpen) return;

      parent.postMessage(
        {
          pluginMessage: {
            type: "resizeUIHeight",
            height,
          },
        },
        "*"
      );
    });

    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isCodePreviewOpen]);

  // pass changed to figma controller
  useDidUpdate(() => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "JSONSettingsConfig",
          config: JSONsettingsConfig,
        },
      },
      "*"
    );
  }, [JSONsettingsConfig]);

  // handle code preview
  useDidUpdate(() => {
    if (isCodePreviewOpen) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "openCodePreview",
            isCodePreviewOpen,
            height: frameHeight,
          },
        },
        "*"
      );
    }
  }, [isCodePreviewOpen]);

  /////////////////////
  // RENDER FUNCTION //
  /////////////////////

  const renderView = () => {
    if (isLoading) {
      return <LoadingView />;
    }

    if (!fileHasVariables) {
      return <EmptyView />;
    }

    if (currentView === "main") {
      return (
        <MainView
          {...commonProps}
          isCodePreviewOpen={isCodePreviewOpen}
          setIsCodePreviewOpen={setIsCodePreviewOpen}
        />
      );
    }

    if (currentView === "jsonbin") {
      return <ServerSettingsView {...commonProps} server="jsonbin" />;
    }

    if (currentView === "github") {
      return <ServerSettingsView {...commonProps} server="github" />;
    }

    if (currentView === "customURL") {
      return <ServerSettingsView {...commonProps} server="customURL" />;
    }
  };

  return (
    <div ref={wrapperRef} className={styles.container}>
      {renderView()}
    </div>
  );
};

export default Container;
