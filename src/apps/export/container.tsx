import React, { useState } from "react";

import { MainView } from "./MainView";

const Container = () => {
  const [JSONsettingsConfig, setJSONsettingsConfig] = useState({
    namesTransform: "none",
    includeStyles: [],
    includeScopes: false,
    splitFiles: false,
  } as JSONSettingsConfigI);

  //////////////////////
  // HANDLE FUNCTIONS //
  //////////////////////

  /////////////////
  // USE EFFECTS //
  /////////////////

  /////////////////////
  // RENDER FUNCTION //
  /////////////////////

  return (
    <MainView
      JSONsettingsConfig={JSONsettingsConfig}
      setJSONsettingsConfig={setJSONsettingsConfig}
    />
  );
};

export default Container;
