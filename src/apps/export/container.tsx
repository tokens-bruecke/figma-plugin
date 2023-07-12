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
    colorMode: "hex",
    includeScopes: false,
    splitFiles: false,
    servers: {
      jsonbin: {
        isEnabled: false,
        id: "",
        name: "",
        secretKey: "",
      },
      github: {
        isEnabled: false,
        repo: "",
        branch: "",
        token: "",
        path: "",
      },
      gitlab: {
        isEnabled: false,
        repo: "",
        branch: "",
        token: "",
        path: "",
      },
      bitbucket: {
        isEnabled: false,
        repo: "",
        branch: "",
        token: "",
        path: "",
      },
      customURL: {
        isEnabled: false,
        repo: "",
        branch: "",
        token: "",
        path: "",
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
      const { type, hasVariables, storageConfig } = event.data.pluginMessage;

      // check if file has variables
      if (type === "checkForVariables") {
        setFileHasVariables(hasVariables);
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
};

export default Container;
