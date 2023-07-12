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
  IconButton,
  Text,
  Toggle,
  OverlayList,
} from "pavelLaptev/react-figma-ui/ui";

import { pushToJSONBin } from "./../../../utils/servers/pushToJSONBin";
import { pushToGithub } from "./../../../utils/servers/pushToGithub";

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
    label: "JSONBin",
    iconName: "jsonbin",
  },
  {
    id: "github",
    label: "Github",
    iconName: "github",
  },
  {
    id: "gitlab",
    label: "Gitlab",
    iconName: "gitlab",
  },
  {
    id: "bitbucket",
    label: "Bitbucket",
    iconName: "bitbucket",
  },
  {
    id: "customURL",
    label: "Custom URL",
    iconName: "custom-url",
  },
];

export const MainView = (props: ViewProps) => {
  const { JSONsettingsConfig, setJSONsettingsConfig } = props;
  const [showServersOverlayList, setShowServersOverlayList] = useState(false);
  const [generatedTokens, setGeneratedTokens] = useState({} as any);

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

  const handleServerView = (serverId: string) => {
    props.setCurrentView(serverId);
  };

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
  };

  const getTokensForPush = () => {
    // send command to figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: "getTokens",
          role: "push",
          server: "github",
        } as TokensMessageI,
      },
      "*"
    );
  };

  /////////////////
  // USE EFFECTS //
  /////////////////

  // Recieve tokens from figma controller
  useEffect(() => {
    window.onmessage = (event) => {
      const { type, tokens, role, server } = event.data
        .pluginMessage as TokensMessageI;

      if (type === "setTokens") {
        if (role === "preview") {
          console.log("tokens preview", tokens);
          setGeneratedTokens(tokens);
        }

        if (role === "push") {
          if (server === "jsonbin") {
            pushToJSONBin(JSONsettingsConfig.servers.jsonbin, tokens);
          }

          if (server === "github") {
            pushToGithub(tokens).then((response) => {
              console.log("response", response);
            });
          }
        }
      }
    };
  }, []);

  //
  // useEffect(() => {
  //   console.log("generatedTokens", generatedTokens);
  // }, [generatedTokens]);

  //////////////////////
  // RENDER VARIABLES //
  //////////////////////

  const isAnyServerEnabled = Object.keys(JSONsettingsConfig.servers).some(
    (serverId) => JSONsettingsConfig.servers[serverId].isEnabled
  );
  const dynamicServerList = serverList.filter((server) => {
    if (!JSONsettingsConfig.servers[server.id].isEnabled) {
      return server;
    }
  });

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

        <Stack hasLeftRightPadding={false} hasTopBottomPadding gap={2}>
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
          title="Connect server"
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
                      onClick={handleServerView}
                      optionsSections={[
                        {
                          options: dynamicServerList,
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

        <Stack
          hasLeftRightPadding
          hasTopBottomPadding
          gap={"var(--space-extra-small)"}
        >
          {Object.keys(JSONsettingsConfig.servers).map((serverId, index) => {
            if (!JSONsettingsConfig.servers[serverId].isEnabled) {
              return null;
            }

            const server = serverList.find(
              (server) => server.id === serverId
            ) as (typeof serverList)[0];

            const handleNewView = () => {
              props.setCurrentView(server.id);
            };

            return (
              <Stack
                className={styles.rowItem}
                key={index}
                hasLeftRightPadding={false}
                direction="row"
                onClick={handleNewView}
                gap={1}
              >
                <Icon name={server.iconName} size="32" />
                <Text className={styles.rowItemText}>{server.label}</Text>
                <IconButton
                  onClick={handleNewView}
                  children={<Icon name="kebab" size="32" />}
                />
              </Stack>
            );
          })}

          {isAnyServerEnabled && (
            <Stack hasTopBottomPadding>
              <Button
                label="Push to server"
                onClick={getTokensForPush}
                fullWidth
              />
            </Stack>
          )}
        </Stack>
      </Panel>

      <Panel hasLeftRightPadding>
        <Stack hasLeftRightPadding hasTopBottomPadding>
          <Button
            label="Download JSON"
            onClick={getTokensPreview}
            fullWidth
            secondary
          />
        </Stack>
      </Panel>
    </Stack>
  );
};
