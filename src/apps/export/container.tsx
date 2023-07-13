import React, { useState, useEffect } from "react";

import { useDidUpdate } from "../../utils/hooks/useDidUpdate";

import { MainView } from "./MainView";
import { ServerSettingsView } from "./ServerSettingsView";

const Container = () => {
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

  /////////////////////
  // RENDER FUNCTION //
  /////////////////////

  if (!fileHasVariables) {
    return <div>no varaibles in this file</div>;
  }

  if (currentView === "main") {
    return <MainView {...commonProps} />;
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

export default Container;
