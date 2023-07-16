import React, { useEffect, useState } from "react";

import { InitialView } from "./InitialView";
import { ImportView } from "./ImportView";

import styles from "./styles.module.scss";

const Container = () => {
  const wrapperRef = React.useRef(null);
  const [fileData, setFileData] = useState(null);
  const [currentView, setCurrentView] = useState("initial");

  //////////////////////
  // HANDLE FUNCTIONS //
  //////////////////////

  /////////////////
  // USE EFFECTS //
  /////////////////

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      const { height } = entries[0].contentRect;

      console.log("height", height);
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
  }, []);

  /////////////////////
  // RENDER FUNCTION //
  /////////////////////

  const renderView = () => {
    if (currentView === "initial") {
      return (
        <InitialView
          setFileData={setFileData}
          setCurrentView={setCurrentView}
        />
      );
    }

    if (currentView === "import") {
      return (
        <ImportView
          fileData={fileData}
          setCurrentView={setCurrentView}
          setFileData={setFileData}
        />
      );
    }

    return null;
  };

  return (
    <div ref={wrapperRef} className={styles.container}>
      {renderView()}
    </div>
  );
};

export default Container;
