import React, { useEffect, useState } from "react";
import styles from "./styles.module.scss";
import pkg from "../../../../package.json";

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

import { config } from "../../controller/config";

import { Toast } from "../../components/Toast";
import { ServerSettingsView } from "../ServerSettingsView";

import { pushToJSONBin } from "../../api/servers/pushToJSONBin";
import { pushToGithub } from "../../api/servers/pushToGithub";
import { githubPullRequest } from "../../api/servers/githubPullRequest";
import { pushToGitlab } from "../../api/servers/pushToGitlab";
import { pushToCustomURL } from "../../api/servers/pushToCustomURL";

import { downloadTokensFile } from "../../api/downloadTokensFile";

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
  isCodePreviewOpen: boolean;
  setIsCodePreviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setGeneratedTokens: React.Dispatch<React.SetStateAction<object>>;
  currentView: string;
}

const version = pkg.version;
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
    id: "githubPullRequest",
    label: "Github PR",
    iconName: "github",
  },
  {
    id: "gitlab",
    label: "Gitlab",
    iconName: "gitlab",
  },
  {
    id: "customURL",
    label: "Custom URL",
    iconName: "custom-url-server",
  },
];

export const SettingsView = (props: ViewProps) => {
  const toastRef = React.useRef(null);
  const {
    JSONsettingsConfig,
    setJSONsettingsConfig,
    isCodePreviewOpen,
    setIsCodePreviewOpen,
    setGeneratedTokens,
    currentView,
    setCurrentView,
  } = props;
  const [isPushing, setIsPushing] = useState(false);
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

  const handleDTCGKeys = (checked: boolean) => {
    // console.log("handleSplitFilesChange", checked);

    setJSONsettingsConfig({
      ...JSONsettingsConfig,
      useDTCGKeys: checked,
    });
  };

  const handleIncludeValueAliasString = (checked: boolean) => {
    // console.log("handleSplitFilesChange", checked);

    setJSONsettingsConfig({
      ...JSONsettingsConfig,
      includeValueAliasString: checked,
    });
  };

  const handleShowOutput = () => {
    setIsCodePreviewOpen(!isCodePreviewOpen);
    getTokensPreview();
  };

  const handleShowServersOverlayList = () => {
    setShowServersOverlayList(!showServersOverlayList);
  };

  const handleServerView = (serverId: string) => {
    props.setCurrentView(serverId);
    // console.log("serverId", serverId);
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

  const getTokensForDownload = () => {
    // send command to figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: "getTokens",
          role: "download",
        } as TokensMessageI,
      },
      "*"
    );
  };

  const getTokensForPush = () => {
    setIsPushing(true);

    const allEnabledServers = Object.keys(JSONsettingsConfig.servers).filter(
      (serverId) => JSONsettingsConfig.servers[serverId].isEnabled
    );

    console.log("all enebled servers", allEnabledServers);

    // send command to figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: "getTokens",
          role: "push",
          server: allEnabledServers,
        } as TokensMessageI,
      },
      "*"
    );
  };

  /////////////////
  // USE EFFECTS //
  /////////////////

  // Receive tokens from figma controller
  useEffect(() => {
    window.onmessage = async (event) => {
      const { type, tokens, role, server } = event.data
        .pluginMessage as TokensMessageI;

      if (type === "setTokens") {
        if (role === "preview") {
          // console.log("tokens preview", tokens);
          setGeneratedTokens(tokens);
        }

        if (role === "download") {
          // console.log("tokens download", tokens);
          downloadTokensFile(tokens);
        }

        if (role === "push") {
          if (server.includes("jsonbin")) {
            console.log("push to jsonbin");
            await pushToJSONBin(
              JSONsettingsConfig.servers.jsonbin,
              tokens,
              (params) => {
                toastRef.current.show(params);
              }
            );
          }

          if (server.includes("github")) {
            // console.log("github config", JSONsettingsConfig.servers.github);
            console.log("push to github");
            await pushToGithub(
              JSONsettingsConfig.servers.github,
              tokens,
              (params) => {
                toastRef.current.show(params);
              }
            );
          }

          if (server.includes("githubPullRequest")) {
            console.log("create github pull request");
            await githubPullRequest(
              JSONsettingsConfig.servers.githubPullRequest,
              tokens,
              (params) => {
                toastRef.current.show(params);
              }
            );
          }

          if (server.includes("gitlab")) {
            console.log("push to gitlab");
            await pushToGitlab(
              JSONsettingsConfig.servers.gitlab,
              tokens,
              (params) => {
                toastRef.current.show(params);
              }
            );
          }

          if (server.includes("customURL")) {
            console.log("push to customURL");
            await pushToCustomURL(JSONsettingsConfig.servers.customURL, tokens);
          }

          setIsPushing(false);
          console.log("push done");
        }
      }
    };
  }, [JSONsettingsConfig]);

  //////////////
  useEffect(() => {
    // reset isPushing to false after 10 second
    if (isPushing) {
      setTimeout(() => {
        setIsPushing(false);
      }, 10000);
    }
  }, [isPushing]);

  //////////////////////
  // RENDER VARIABLES //
  //////////////////////

  const isAllServersEnabled = Object.keys(JSONsettingsConfig.servers).every(
    (serverId) => JSONsettingsConfig.servers[serverId].isEnabled
  );

  const isAnyServerEnabled = Object.keys(JSONsettingsConfig.servers).some(
    (serverId) => JSONsettingsConfig.servers[serverId].isEnabled
  );

  const dynamicServerList = serverList.filter((server) => {
    if (!JSONsettingsConfig.servers[server.id]?.isEnabled) {
      return server;
    }
  });

  //
  useEffect(() => {
    console.log("JSONsettingsConfig Settings View >>>>", JSONsettingsConfig);
  }, [JSONsettingsConfig]);

  /////////////////
  // MAIN RENDER //
  /////////////////

  const mainView = (
    <>
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
                    label: "RGBA CSS",
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
                    label: "HSLA CSS",
                  },
                  {
                    id: "hsla-object",
                    label: "HSLA Object",
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
            const configStylesList = JSONsettingsConfig.includedStyles;
            const styleItem = configStylesList[item.id];

            // check if style item is included
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
                      includedStyles: {
                        ...configStylesList,
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
                      includedStyles: {
                        ...configStylesList,
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

      {Object.keys(JSONsettingsConfig.includedStyles).some((styleId) => {
        return JSONsettingsConfig.includedStyles[styleId].isIncluded;
      }) && (
        <Panel>
          <Stack hasLeftRightPadding>
            <Dropdown
              label="Add styles to"
              value={JSONsettingsConfig.storeStyleInCollection}
              onChange={(value: string) => {
                setJSONsettingsConfig({
                  ...JSONsettingsConfig,
                  storeStyleInCollection: value,
                });
              }}
              optionsSections={[
                {
                  options: [
                    {
                      id: "none",
                      label: "Keep separate",
                    },
                  ],
                },
                {
                  options: JSONsettingsConfig.variableCollections.map(
                    (collection) => {
                      return {
                        id: collection,
                        label: collection,
                      };
                    }
                  ),
                },
              ]}
            />
          </Stack>
        </Panel>
      )}

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
            id="use-dtcg-key"
            checked={JSONsettingsConfig.useDTCGKeys}
            onChange={handleDTCGKeys}
          >
            <Text>Use DTCG keys format</Text>
          </Toggle>
        </Stack>
      </Panel>

      <Panel>
        <Stack hasLeftRightPadding>
          <Toggle
            id="include-value-alias-string"
            checked={JSONsettingsConfig.includeValueAliasString}
            onChange={handleIncludeValueAliasString}
          >
            <Text>
              Include <span className={styles.codeLine}>.value</span> string for
              aliases
            </Text>
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
              disabled: isAllServersEnabled,
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

        {isAnyServerEnabled && (
          <Stack
            hasLeftRightPadding
            hasTopBottomPadding
            gap="var(--space-small)"
          >
            <Stack hasLeftRightPadding={false} gap={4}>
              {Object.keys(JSONsettingsConfig.servers).map(
                (serverId, index) => {
                  if (!JSONsettingsConfig.servers[serverId].isEnabled) {
                    return null;
                  }

                  const server = serverList.find(
                    (server) => server.id === serverId
                  ) as (typeof serverList)[0];

                  return (
                    <Stack
                      className={styles.rowItem}
                      key={index}
                      hasLeftRightPadding={false}
                      direction="row"
                      onClick={() => handleServerView(serverId)}
                      gap={1}
                    >
                      <Icon name={server.iconName} size="32" />
                      <Text className={styles.rowItemText}>{server.label}</Text>
                      <IconButton
                        onClick={() => handleServerView(serverId)}
                        children={<Icon name="kebab" size="32" />}
                      />
                    </Stack>
                  );
                }
              )}
            </Stack>

            <Stack>
              <Button
                loading={isPushing}
                label="Push to server"
                onClick={getTokensForPush}
                fullWidth
              />
            </Stack>
          </Stack>
        )}
      </Panel>

      {/* <Button
        label="Push to Gitlab"
        onClick={() => {
          pushToGitlab();
        }}
      /> */}

      <Panel hasLeftRightPadding bottomBorder={false}>
        <Stack hasLeftRightPadding hasTopBottomPadding>
          <Button
            label="Download JSON"
            onClick={getTokensForDownload}
            fullWidth
            secondary
          />
        </Stack>
      </Panel>
    </>
  );

  // Select which view to render
  // based on currentView state

  const commonProps = {
    JSONsettingsConfig,
    setJSONsettingsConfig,
    setCurrentView,
  };

  const selectRender = () => {
    if (currentView === "main") {
      return mainView;
    }

    if (currentView === "jsonbin") {
      return <ServerSettingsView {...commonProps} server="jsonbin" />;
    }

    if (currentView === "github") {
      return <ServerSettingsView {...commonProps} server="github" />;
    }

    if (currentView === "gitlab") {
      return <ServerSettingsView {...commonProps} server="gitlab" />;
    }

    if (currentView === "githubPullRequest") {
      return <ServerSettingsView {...commonProps} server="githubPullRequest" />;
    }

    if (currentView === "customURL") {
      return <ServerSettingsView {...commonProps} server="customURL" />;
    }
  };

  return (
    <>
      <Toast ref={toastRef} />
      <Stack
        className={`${styles.settingView} ${
          isCodePreviewOpen ? styles.fitHighToFrame : ""
        }`}
        hasLeftRightPadding={false}
      >
        <div className={styles.dynamicContent}>{selectRender()}</div>

        <Panel
          hasTopBottomPadding
          hasLeftRightPadding
          topBorder
          bottomBorder={false}
        >
          <Stack hasTopBottomPadding direction="row" className={styles.about}>
            <a href={config.docsLink} target="_blank">
              <Text>Documentation</Text>
            </a>
            <a href={config.changelogLink} target="_blank">
              <Text>v.{version}</Text>
            </a>
          </Stack>
        </Panel>
      </Stack>
    </>
  );
};
