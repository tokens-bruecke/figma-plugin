import React, { useRef } from "react";

import { Button } from "pavelLaptev/react-figma-ui/ui";
import { StatusPicture } from "../../../components/StatusPicture";

import styles from "./styles.module.scss";

interface InitialViewProps {
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
  setFileData: React.Dispatch<React.SetStateAction<object>>;
}

export const InitialView = (props: InitialViewProps) => {
  const { setCurrentView, setFileData } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.readAsText(file);

    reader.onload = (event) => {
      const data = event.target?.result;

      if (!data) {
        return;
      }

      setFileData(JSON.parse(data as string));
      setCurrentView("import");

      // parent.postMessage(
      //   {
      //     pluginMessage: {
      //       type: "importTokens",
      //       tokens: JSON.parse(data as string),
      //     },
      //   },
      //   "*"
      // );
    };
  };

  return (
    <section className={styles.emptyView}>
      <StatusPicture status="tokens" />
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileChange}
        accept="application/json"
      />
      <Button label="Import from a file" onClick={handleImport} secondary />
    </section>
  );
};
