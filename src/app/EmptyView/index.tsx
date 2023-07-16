import React from "react";

import { config } from "../../utils/config";

import { Text, Button } from "pavelLaptev/react-figma-ui/ui";
import { StatusPicture } from "../../components/StatusPicture";

import styles from "./styles.module.scss";

export const EmptyView = () => {
  return (
    <section className={styles.emptyView}>
      <StatusPicture status="error" />
      <Text className={styles.label}>Create some variables fisrt</Text>
      <Button
        className={styles.button}
        label="Documentation"
        onClick={() => {
          window.open(config.docsLink, "_blank");
        }}
      />
    </section>
  );
};
