import React from "react";

import styles from "./styles.module.scss";

import { countTokens } from "../../utils/countTokens";

import { Text, Icon } from "pavelLaptev/react-figma-ui/ui";

interface CodePreviewViewProps {
  generatedTokens: any;
}

export const CodePreviewView = ({ generatedTokens }: CodePreviewViewProps) => {
  const [isButtonAnimated, setIsButtonAnimated] =
    React.useState<boolean>(false);

  const getTokensPreview = () => {
    // send command to figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: "getTokens",
          role: "preview",
        } as TokensMessageI,
      },
      "*"
    );

    // start animation
    setIsButtonAnimated(true);

    // stop animation
    setTimeout(() => {
      setIsButtonAnimated(false);
    }, 500);
  };

  const getTokensStat = () => {
    // get lines count
    const codeLines = JSON.stringify(generatedTokens, null, 2).split(
      "\n"
    ).length;

    console.log("codeLines", codeLines);

    // get groups count
    const groupsCount = Object.keys(generatedTokens).reduce((acc, key) => {
      const group = generatedTokens[key];
      const groupKeys = Object.keys(group);

      return acc + groupKeys.length;
    }, 0);

    const tokensCount = countTokens(generatedTokens);

    // count size in bytes
    const size = new TextEncoder().encode(
      JSON.stringify(generatedTokens)
    ).length;

    return {
      codeLines,
      groupsCount,
      tokensCount,
      size,
    };
  };

  const tokensStat = getTokensStat();

  return (
    <section className={styles.codePreview}>
      <section className={styles.previewToolbar}>
        <button
          className={`${styles.toolbarItem} ${styles.previewToolbarButton} ${
            isButtonAnimated ? styles.successUpdateAnimation : ""
          }`}
          onClick={getTokensPreview}
        >
          <Icon name="refresh" size="16" />
          <Text>Update</Text>
        </button>

        <div className={`${styles.toolbarItem} ${styles.previewToolbarStat}`}>
          <Text>
            {tokensStat.tokensCount} tokens, {tokensStat.groupsCount} groups,{" "}
            {tokensStat.codeLines} lines
          </Text>
        </div>

        <div className={`${styles.toolbarItem} ${styles.previewToolbarStat}`}>
          <Text>{tokensStat.size / 1000} KB</Text>
        </div>
      </section>

      <pre>
        <code>{JSON.stringify(generatedTokens, null, 2)}</code>
      </pre>
    </section>
  );
};
