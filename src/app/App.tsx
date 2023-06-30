import React, { useState, useEffect } from "react";
import styles from "./app.module.scss";

import Select from "./components/Select";

const App = () => {
  const [nameTransformConfig, setNameTransformConfig] = useState({
    join: "default",
    case: "default",
  });

  useEffect(() => {
    // chrome.storage.sync.set({ currentCaseTransform });

    console.log("nameTransformConfig", nameTransformConfig);
  }, [nameTransformConfig]);

  return (
    <section className={styles.wrap}>
      <section>
        <h2>Settings</h2>

        <hr />
        <h3>Variables join transform</h3>
        <Select
          id="join-transform"
          label="Variables join transform"
          onChange={(option) => {
            setNameTransformConfig({
              ...nameTransformConfig,
              join: option,
            });
          }}
          options={["default", "camelCase", "snake_case", "kebab-case"]}
        />
        <Select
          id="case-transform"
          label="Variables case transform"
          onChange={(option) => {
            setNameTransformConfig({
              ...nameTransformConfig,
              case: option,
            });
          }}
          options={["default", "upperCase", "lowerCase"]}
        />
        <hr />
      </section>
    </section>
  );
};

export default App;
