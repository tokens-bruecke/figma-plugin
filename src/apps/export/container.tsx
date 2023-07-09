import React, { useState, useEffect } from "react";

import { MainView } from "./MainView";

const Container = () => {
  const [avaliableCollections, setAvaliableCollections] = useState([]);
  const [JSONsettingsConfig, setJSONsettingsConfig] = useState({
    namesTransform: "none",
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
  } as JSONSettingsConfigI);

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

  return (
    <MainView
      JSONsettingsConfig={JSONsettingsConfig}
      setJSONsettingsConfig={setJSONsettingsConfig}
      collections={avaliableCollections}
    />
  );
};

export default Container;
