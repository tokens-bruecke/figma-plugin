import React, { useState, useEffect } from "react";
import styles from "./app.module.scss";

import Select from "./components/Select";

const App = () => {
  const [currentCaseTransform, setCurrentCaseTransform] = useState(
    "default" as CaseTransform
  );

  useEffect(() => {
    // chrome.storage.sync.set({ currentCaseTransform });

    parent.postMessage(
      {
        pluginMessage: {
          type: "set-case-transform",
          currentCaseTransform,
        },
      },
      "*"
    );
  }, [currentCaseTransform]);

  return (
    <section className={styles.wrap}>
      <section>
        <h1>Settings</h1>

        <hr />
        <h2>Variables names transform</h2>
        <Select
          onChange={setCurrentCaseTransform}
          options={["default", "camelCase", "snake_case", "kebab-case"]}
        />

        <hr />
      </section>
    </section>
  );
};

export default App;
