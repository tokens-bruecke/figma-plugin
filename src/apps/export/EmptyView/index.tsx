import React from "react";

import { Text } from "pavelLaptev/react-figma-ui/ui";
import { StatusPicture } from "../../../components/StatusPicture";

import styles from "./styles.module.scss";

export const EmptyView = () => {
  return (
    <section className={styles.emptyView}>
      <StatusPicture status="error" />
      <Text className={styles.label}>No variables in the file</Text>
    </section>
  );
};
