import React, { useState, useEffect } from "react";
import styles from "./styles.module.scss";

import {
  Panel,
  PanelHeader,
  Dropdown,
  Stack,
  Button,
  Icon,
  OverlayList,
  Text,
  Toggle,
} from "pavelLaptev/react-figma-ui/ui";

type StyleListItemType = {
  id: string;
  label: string;
  icon: JSX.Element;
};

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

export const ExportView = () => {
  const stylesHeaderRef = React.useRef(null);

  const [stylesOverlayList, setStylesOverlayList] = useState(
    stylesList as StyleListItemType[]
  );
  const [isShowOverlayListOpen, setIsShowOverlayListOpen] = useState(false);
  const [JSONsettingsConfig, setJSONsettingsConfig] = useState({
    namesTransform: "none",
    includeStyles: [],
    includeScopes: false,
    splitFiles: false,
  } as JSONSettingsConfigI);

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

  const handleShowStylesOverlayList = () => {
    console.log("plus button");
    setIsShowOverlayListOpen(!isShowOverlayListOpen);
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

  //////////////////////
  // RENDER FUNCTIONS //
  //////////////////////

  const renderStylesAddButtons = () => {
    const plusButton = {
      onClick: handleShowStylesOverlayList,
      disabled: stylesOverlayList.length === 0,
      children: (
        <>
          <Icon name="plus" size="32" />

          {isShowOverlayListOpen && (
            <OverlayList
              className={styles.overlayStylesList}
              blockPointerEventsFor={stylesHeaderRef.current}
              onOutsideClick={() => {
                setIsShowOverlayListOpen(false);
              }}
              onClick={(id: stylesType) => {
                //remove from list
                const newStylesList = stylesOverlayList.filter(
                  (item) => item.id !== id
                );

                setStylesOverlayList(newStylesList);

                // add to config
                setJSONsettingsConfig({
                  ...JSONsettingsConfig,
                  includeStyles: [
                    ...JSONsettingsConfig.includeStyles,
                    {
                      type: id,
                      name: stylesList.find((item) => item.id === id)?.label,
                      collection: null,
                    },
                  ],
                });
              }}
              optionsSections={[
                {
                  options: stylesOverlayList,
                },
              ]}
            />
          )}
        </>
      ),
    };

    const minusButton = {
      onClick: () => {
        // delete first item from config and add to list
        const firstItem = JSONsettingsConfig.includeStyles[0];

        setJSONsettingsConfig({
          ...JSONsettingsConfig,
          includeStyles: JSONsettingsConfig.includeStyles.filter(
            (_, index) => index !== 0
          ),
        });

        setStylesOverlayList([
          ...stylesOverlayList,
          {
            id: firstItem.type,
            label: firstItem.name,
            icon: stylesList.find((item) => item.id === firstItem.type)?.icon,
          },
        ]);
      },
      children: <Icon name="minus" size="32" />,
    };

    if (JSONsettingsConfig.includeStyles.length <= 0) {
      return [plusButton];
    }

    if (JSONsettingsConfig.includeStyles.length >= 1) {
      return [minusButton, plusButton];
    }
  };

  /////////////////
  // MAIN RENDER //
  /////////////////

  return (
    <section className={styles.wrap}>
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
                ],
              },
              {
                options: [
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
                ],
              },
              {
                options: [
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
              {
                options: [
                  {
                    id: "COBOL-CASE",
                    label: "COBOL-CASE",
                  },
                  {
                    id: "MACRO_CASE",
                    label: "MACRO_CASE",
                  },
                  {
                    id: "Ada_Case",
                    label: "Ada_Case",
                  },
                  {
                    id: "dot.notation",
                    label: "dot.notation",
                  },
                ],
              },
            ]}
          />
        </Stack>
      </Panel>

      <Panel>
        <PanelHeader
          ref={stylesHeaderRef}
          title="Include styles"
          isActive={JSONsettingsConfig.includeStyles.length > 0}
          onClick={
            JSONsettingsConfig.includeStyles.length === 0 &&
            handleShowStylesOverlayList
          }
          iconButtons={renderStylesAddButtons()}
        />
        <Stack>
          {JSONsettingsConfig.includeStyles.map((item, index) => {
            return (
              <Stack direction="row" key={index} hasLeftRightPadding={false}>
                {stylesList.find((style) => style.id === item.type)?.icon}
                <Text>{item.name}</Text>
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
          title="Push to server"
          onClick={handleConnectToServer}
          iconButtons={[
            {
              children: <Icon name="plus" size="32" />,
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
