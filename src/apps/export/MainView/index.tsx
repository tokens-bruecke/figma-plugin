import React, { useEffect, useState } from "react";
import styles from "./styles.module.scss";

import {
  Panel,
  PanelHeader,
  Dropdown,
  Stack,
  Button,
  Input,
  Icon,
  Text,
  Toggle,
  OverlayList,
} from "pavelLaptev/react-figma-ui/ui";

type StyleListItemType = {
  id: stylesType;
  label: string;
  icon: JSX.Element;
};

interface ViewProps {
  JSONsettingsConfig: JSONSettingsConfigI;
  setJSONsettingsConfig: React.Dispatch<
    React.SetStateAction<JSONSettingsConfigI>
  >;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
  collections: {
    id: string;
    name: string;
  }[];
}

const stylesList = [
  {
    id: "text",
    label: "Typography",
    icon: <Icon name="text" size="32" />,
  },
  {
    id: "grids",
    label: "Grids",
    icon: <Icon name="grid-styles" size="32" />,
  },
  {
    id: "effects",
    label: "Effects",
    icon: <Icon name="effects" size="32" />,
  },
] as StyleListItemType[];

const serverList = [
  {
    id: "jsonbin",
    label: "JSONbin",
  },
  {
    id: "github",
    label: "Github",
  },
];

export const MainView = (props: ViewProps) => {
  const { JSONsettingsConfig, setJSONsettingsConfig } = props;
  const [showServersOverlayList, setShowServersOverlayList] = useState(false);

  const serversHeaderRef = React.useRef(null);

  //////////////////////
  // HANDLE FUNCTIONS //
  //////////////////////

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

  const handleShowServersOverlayList = () => {
    setShowServersOverlayList(!showServersOverlayList);
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

  /////////////////
  // MAIN RENDER //
  /////////////////

  return (
    <Stack className={styles.wrap} hasLeftRightPadding={false}>
      <Panel>
        <PanelHeader
          title="Show output"
          onClick={handleShowOutput}
          iconButtons={[
            {
              children: <Icon name="sidebar" size="32" />,
              onClick: handleShowOutput,
            },
          ]}
        />
      </Panel>

      <Panel>
        <Stack hasLeftRightPadding>
          <Dropdown
            label="Color mode"
            value={JSONsettingsConfig.colorMode}
            onChange={(value: colorModeType) => {
              setJSONsettingsConfig({
                ...JSONsettingsConfig,
                colorMode: value,
              });
            }}
            optionsSections={[
              {
                options: [
                  {
                    id: "hex",
                    label: "HEX",
                  },
                ],
              },
              {
                options: [
                  {
                    id: "rgba-css",
                    label: "RGB CSS",
                  },
                  {
                    id: "rgba-object",
                    label: "RGBA Object",
                  },
                ],
              },
              {
                options: [
                  {
                    id: "hsla-css",
                    label: "HSL CSS",
                  },
                  {
                    id: "hsla-object",
                    label: "HSL Object",
                  },
                ],
              },
            ]}
          />
        </Stack>
      </Panel>

      <Panel>
        <PanelHeader title="Include styles" isActive />

        <Stack hasLeftRightPadding={false} gap={2}>
          {stylesList.map((item, index) => {
            const stylesList = JSONsettingsConfig.includeStyles;
            const styleItem = stylesList[item.id];
            const isIncluded = styleItem.isIncluded;

            return (
              <Stack key={index} direction="row" gap="var(--space-extra-small)">
                <Input
                  className={styles.styleNameInput}
                  id={`style-${item.id}`}
                  hasOutline={false}
                  value={styleItem.customName}
                  leftIcon={item.icon}
                  onChange={(value: string) => {
                    setJSONsettingsConfig({
                      ...JSONsettingsConfig,
                      includeStyles: {
                        ...stylesList,
                        [item.id]: {
                          ...styleItem,
                          customName: value,
                        },
                      },
                    });
                  }}
                />
                <Toggle
                  id={`toggle-${item.id}`}
                  checked={isIncluded}
                  onChange={(checked: boolean) => {
                    setJSONsettingsConfig({
                      ...JSONsettingsConfig,
                      includeStyles: {
                        ...stylesList,
                        [item.id]: {
                          ...styleItem,
                          isIncluded: checked,
                        },
                      },
                    });
                  }}
                />
              </Stack>
            );
          })}
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
          ref={serversHeaderRef}
          title="Push to server"
          onClick={handleShowServersOverlayList}
          iconButtons={[
            {
              children: (
                <>
                  <Icon name="plus" size="32" />

                  {showServersOverlayList && (
                    <OverlayList
                      trigger={serversHeaderRef.current}
                      className={styles.overlayServerList}
                      onOutsideClick={handleShowServersOverlayList}
                      onClick={(id: stylesType) => {
                        props.setCurrentView(id);
                      }}
                      optionsSections={[
                        {
                          options: serverList,
                        },
                      ]}
                    />
                  )}
                </>
              ),
              onClick: handleShowServersOverlayList,
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
    </Stack>
  );
};
