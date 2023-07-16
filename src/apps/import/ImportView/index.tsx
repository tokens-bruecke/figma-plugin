import React, { useEffect } from "react";

import { Text, Button } from "pavelLaptev/react-figma-ui/ui";
import { StatusPicture } from "../../../components/StatusPicture";

import styles from "./styles.module.scss";

interface ImportViewProps {
  fileData: object;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
  setFileData: React.Dispatch<React.SetStateAction<object>>;
}

function countIds(obj, id) {
  let count = 0;

  function traverse(obj) {
    for (let key in obj) {
      if (key === id) {
        count++;
      } else if (typeof obj[key] === "object") {
        traverse(obj[key]);
      }
    }
  }

  traverse(obj);
  return count;
}

export const ImportView = (props: ImportViewProps) => {
  const [stats, setStats] = React.useState({
    variables: 0,
    styles: 0,
  });

  const handleImport = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "importTokens",
          tokens: props.fileData,
        },
      },
      "*"
    );
  };

  const handleCancel = () => {
    props.setCurrentView("initial");
    props.setFileData({});
  };

  useEffect(() => {
    const variables = countIds(props.fileData, "variableId");
    const styles = countIds(props.fileData, "styleId");

    setStats({
      variables,
      styles,
    });
  }, [props.fileData]);

  return (
    <section className={styles.emptyView}>
      <div className={styles.header}>
        <StatusPicture status="tokens" />
        <div className={styles.text}>
          <Text>
            found {stats.variables} variable{stats.variables > 1 ? "s" : ""}
          </Text>
          <Text>
            and {stats.styles} style{stats.styles > 1 ? "s" : ""}
          </Text>
        </div>
      </div>
      <div className={styles.buttons}>
        <Button label="Import" fullWidth onClick={handleImport} />
        <Button label="Cancel" secondary fullWidth onClick={handleCancel} />
      </div>
    </section>
  );
};
