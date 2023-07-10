import React, { useState, useEffect } from "react";

import { MainView } from "./MainView";
import { JSONbinView } from "./JSONbinView";

const Container = () => {
  const [currentView, setCurrentView] = useState("main");
  const [avaliableCollections, setAvaliableCollections] = useState([]);
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
        id: "",
        name: "",
        secretKey: "",
      },
      github: {
        enabled: false,
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
    parent.postMessage({ pluginMessage: { type: "getCollections" } }, "*");

    window.onmessage = (event) => {
      const { type, data } = event.data.pluginMessage;

      if (type === "setCollections") {
        setAvaliableCollections(data);
      }
    };
  }, []);

  /////////////////////
  // RENDER FUNCTION //
  /////////////////////

  if (avaliableCollections.length === 0) {
    return <div>no varaibles in this file</div>;
  }

  if (currentView === "main") {
    return <MainView {...commonProps} collections={avaliableCollections} />;
  }

  if (currentView === "jsonbin") {
    return <JSONbinView {...commonProps} />;
  }

  if (currentView === "github") {
    return <div>github</div>;
  }
};

export default Container;
