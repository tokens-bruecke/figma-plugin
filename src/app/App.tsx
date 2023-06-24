import * as React from "react";
import styles from "./app.module.scss";

import logoImg from "./assets/logo.svg";
import Input from "./components/Input";
import Button from "./components/Button";

const App = () => {
  const [oultineValue, setOutlineValue] = React.useState("4");

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOutlineValue(e.target.value);
  };

  const handleClick = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "add-outline",
          value: oultineValue,
        },
      },
      "*"
    );
  };

  return (
    <section className={styles.wrap}>
      <img src={logoImg} className={styles.logo} />
      <h1 className={styles.title}>Figma React Boilerplate</h1>
      <p className={styles.description}>
        Select any element on the page and add an outline. This action will show
        you how the plugin and Figma API connect to each other.
      </p>
      <Input
        className={styles.input}
        label="Outline width (px)"
        type="number"
        value={oultineValue}
        onChange={handleInput}
      />
      <Button label="Add outline" onClick={handleClick} />
    </section>
  );
};

export default App;
