import React, { useEffect, useState } from "react";

import { MainView } from "./MainView";

import styles from "./styles.module.scss";

const Container = () => {
  const wrapperRef = React.useRef(null);

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
    return <MainView />;
  };

  return (
    <div ref={wrapperRef} className={styles.container}>
      {renderView()}
    </div>
  );
};

export default Container;
