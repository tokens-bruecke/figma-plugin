import React, { useState, useEffect } from "react";
import styles from "./app.module.scss";

import {
  Panel,
  PanelHeader,
  Dropdown,
  Stack,
  Button,
  Checkbox,
  Text,
  Toggle,
} from "pavelLaptev/react-figma-ui/ui";

const App = () => {
  const [JSONsettingsConfig, setJSONsettingsConfig] = useState({
    namesTransform: "none",
    includeStyles: [],
    includeScopes: false,
    splitFiles: false,
  } as JSONSettingsConfigI);

  //////////////////////
  // HANDLE FUNCTIONS //
  //////////////////////

  const handleIncludeStylesChange = (value: stylesType, checked: boolean) => {
    // console.log("handleIncludeStylesChange", value, checked);

    if (checked) {
      setJSONsettingsConfig({
        ...JSONsettingsConfig,
        includeStyles: [...JSONsettingsConfig.includeStyles, value],
      });
    }

    if (!checked) {
      setJSONsettingsConfig({
        ...JSONsettingsConfig,
        includeStyles: JSONsettingsConfig.includeStyles.filter(
          (item) => item !== value
        ),
      });
    }
  };

  const handleIncludeScopesChange = (checked: boolean) => {
    // console.log("handleIncludeScopesChange", checked);

    setJSONsettingsConfig({
      ...JSONsettingsConfig,
      includeScopes: checked,
    });
  };

  const handleSplitFilesChange = (checked: boolean) => {
    // console.log("handleSplitFilesChange", checked);

    setJSONsettingsConfig({
      ...JSONsettingsConfig,
      splitFiles: checked,
    });
  };

  const handleShowOutput = () => {
    console.log("handleShowOutput");
  };

  const handleConnectToServer = () => {
    console.log("handleConnectToServer");
  };

  const handleDownloadJSON = () => {
    // send command to figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: "generateTokens",
        },
      },
      "*"
    );
  };

  /////////////////
  // USE EFFECTS //
  /////////////////

  // pass changed to figma controller
  useEffect(() => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "JSONSettingsConfig",
          config: JSONsettingsConfig,
        },
      },
      "*"
    );
  }, [JSONsettingsConfig]);

  // Recieve tokens from figma controller
  useEffect(() => {
    window.onmessage = (event) => {
      const { type, tokens } = event.data.pluginMessage;

      if (type === "tokens") {
        console.log("Recieve tokens from figma controller", tokens);
      }
    };
  }, []);

  /////////////////////
  // RENDER FUNCTION //
  /////////////////////

  return (
    <section className={styles.wrap}>
      <Panel>
        <PanelHeader
          title="Show output"
          onClick={handleShowOutput}
          iconButtons={[
            {
              icon: "sidebar",
              onClick: handleShowOutput,
            },
          ]}
        />
      </Panel>

      <Panel>
        <Stack hasLeftRightPadding>
          <Dropdown
            value="none"
            label="Names transform"
            labelFlex={5}
            onChange={(value: nameConventionType) => {
              setJSONsettingsConfig({
                ...JSONsettingsConfig,
                namesTransform: value,
              });
            }}
            optionsSections={[
              {
                options: [
                  {
                    id: "none",
                    label: "None",
                  },
                  {
                    id: "PascalCase",
                    label: "PascalCase",
                  },
                  {
                    id: "camelCase",
                    label: "camelCase",
                  },
                  {
                    id: "snake_case",
                    label: "snake_case",
                  },
                  {
                    id: "kebab-case",
                    label: "kebab-case",
                  },
                  {
                    id: "UPPERCASE",
                    label: "UPPERCASE",
                  },
                  {
                    id: "lowercase",
                    label: "lowercase",
                  },
                ],
              },
            ]}
          />
        </Stack>
      </Panel>

      <Panel>
        <PanelHeader title="Include styles" isActive />
        <Stack>
          <Stack direction="row" hasLeftRightPadding={false}>
            <Checkbox
              id="text-styles"
              checked={JSONsettingsConfig.includeStyles.includes("text")}
              className={styles.flex1}
              onChange={(checked: boolean) => {
                handleIncludeStylesChange("text", checked);
              }}
            >
              <Text>Text</Text>
            </Checkbox>
            <Checkbox
              id="color-styles"
              checked={JSONsettingsConfig.includeStyles.includes("color")}
              className={styles.flex1}
              onChange={(checked: boolean) => {
                handleIncludeStylesChange("color", checked);
              }}
            >
              <Text>Color</Text>
            </Checkbox>
          </Stack>
          <Stack direction="row" hasLeftRightPadding={false}>
            <Checkbox
              id="effects-styles"
              checked={JSONsettingsConfig.includeStyles.includes("effects")}
              className={styles.flex1}
              onChange={(checked: boolean) => {
                handleIncludeStylesChange("effects", checked);
              }}
            >
              <Text>Effects</Text>
            </Checkbox>
            <Checkbox
              id="grids-styles"
              checked={JSONsettingsConfig.includeStyles.includes("grids")}
              className={styles.flex1}
              onChange={(checked: boolean) => {
                handleIncludeStylesChange("grids", checked);
              }}
            >
              <Text>Grids</Text>
            </Checkbox>
          </Stack>
        </Stack>
      </Panel>

      <Panel>
        <Stack>
          <Toggle
            id="scope-feature"
            onChange={(checked: boolean) => {
              handleIncludeScopesChange(checked);
            }}
          >
            <Text>Include variable scopes</Text>
          </Toggle>
        </Stack>
      </Panel>

      <Panel>
        <Stack hasLeftRightPadding>
          <Toggle
            id="split-files"
            checked={JSONsettingsConfig.splitFiles}
            onChange={handleSplitFilesChange}
          >
            <Text>Merge collections into single file</Text>
          </Toggle>
        </Stack>
      </Panel>

      <Panel>
        <PanelHeader
          title="Push to server"
          onClick={handleConnectToServer}
          iconButtons={[
            {
              icon: "plus",
              onClick: handleConnectToServer,
            },
          ]}
        />
      </Panel>

      <Panel hasLeftRightPadding>
        <Stack hasLeftRightPadding hasTopBottomPadding>
          <Button
            label="Download JSON"
            onClick={handleDownloadJSON}
            fullWidth
            secondary
          />
        </Stack>
      </Panel>
    </section>
  );
};

export default App;
