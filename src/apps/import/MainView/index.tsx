import React, { useRef } from "react";

import { Button } from "pavelLaptev/react-figma-ui/ui";
import { StatusPicture } from "../../../components/StatusPicture";

import styles from "./styles.module.scss";

export const MainView = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  return (
    <section className={styles.emptyView}>
      <StatusPicture status="import" />
      <input ref={fileInputRef} type="file" hidden />
      <Button label="Import from a file" onClick={handleImport} secondary />
    </section>
  );
};
