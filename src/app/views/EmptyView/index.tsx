import React from "react";

import { config } from "../../controller/config";

import { Text, Button, Stack } from "pavelLaptev/react-figma-ui/ui";
import { StatusPicture } from "../../components/StatusPicture";

import styles from "./styles.module.scss";

interface EmptyViewProps {
  setFileHasVariables: (value: boolean) => void;
}

export const EmptyView = ({ setFileHasVariables }: EmptyViewProps) => {
  return (
    <section className={styles.emptyView}>
      <Stack gap={8} className={styles.group}>
        <StatusPicture status="error" />
        <Text className={styles.label}>No variables found in the file</Text>
      </Stack>

      <Stack gap={8} className={styles.group}>
        <Button
          className={styles.button}
          label="Continue anyway"
          secondary
          onClick={() => {
            setFileHasVariables(true);
          }}
          fullWidth
        />
        <Button
          className={styles.button}
          label="Documentation"
          onClick={() => {
            window.open(config.docsLink, "_blank");
          }}
          fullWidth
        />
      </Stack>
    </section>
  );
};
