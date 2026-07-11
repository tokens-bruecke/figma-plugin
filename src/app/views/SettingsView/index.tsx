import React, { useEffect, useState } from 'react';
import styles from './styles.module.scss';
import pkg from '@root/package.json';

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
} from 'react-figma-ui/ui';

import { config } from '@app/controller/config';

import { Toast, ToastRefI } from '@app/components/Toast';
import { AdvancedSettingsView } from '@app/views/AdvancedSettingsView';
import { ServerSettingsView } from '@app/views/ServerSettingsView';
import { ProfileDetailView } from '@app/views/ProfileDetailView';
import { NewProfileView } from '@app/views/NewProfileView';

import { pushToJSONBin } from '@app/api/servers/pushToJSONBin';
import { pushToGithub } from '@app/api/servers/pushToGithub';
import { githubPullRequest } from '@app/api/servers/githubPullRequest';
import { pushToGitlab } from '@app/api/servers/pushToGitlab';
import { pushToCustomURL } from '@app/api/servers/pushToCustomURL';

import { downloadTokensFile } from '@app/api/downloadTokensFile';
import { importTokensFile } from '@app/api/importTokensFile';

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
  multiTenantConfig: MultiTenantConfigI;
  setActiveProfileId: (profileId: string) => void;
  addProfile: (profileName: string) => void;
  renameProfile: (profileId: string, profileName: string) => void;
  deleteProfile: (profileId: string) => void;
  isCodePreviewOpen: boolean;
  setIsCodePreviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setGeneratedTokens: React.Dispatch<React.SetStateAction<object>>;
  currentView: string;
  frameHeight: number;
  onResizeHeight: (height: number) => void;
  onResetHeight: () => void;
}

const version = pkg.version;
const stylesList = [
  {
    id: 'text',
    label: 'Typography',
    icon: <Icon name="text" size="32" />,
  },
  {
    id: 'grids',
    label: 'Grids',
    icon: <Icon name="grid-styles" size="32" />,
  },
  {
    id: 'effects',
    label: 'Effects',
    icon: <Icon name="effects" size="32" />,
  },
  {
    id: 'colors',
    label: 'Colors',
    icon: <Icon name="color-styles" size="32" />,
  },
] as StyleListItemType[];

const serverList = [
  {
    id: 'jsonbin',
    label: 'JSONBin',
    iconName: 'jsonbin',
  },
  {
    id: 'github',
    label: 'Github',
    iconName: 'github',
  },
  {
    id: 'githubPullRequest',
    label: 'Github PR',
    iconName: 'github',
  },
  {
    id: 'gitlab',
    label: 'Gitlab',
    iconName: 'gitlab',
  },
  {
    id: 'customURL',
    label: 'Custom URL',
    iconName: 'custom-url-server',
  },
];

export const SettingsView = (props: ViewProps) => {
  const toastRef = React.useRef<ToastRefI>(null);
  const isResizingRef = React.useRef(false);
  const {
    JSONsettingsConfig,
    setJSONsettingsConfig,
    isCodePreviewOpen,
    setIsCodePreviewOpen,
    setGeneratedTokens,
    currentView,
    setCurrentView,
    multiTenantConfig,
    setActiveProfileId,
    addProfile,
    renameProfile,
    deleteProfile,
    frameHeight,
    onResizeHeight,
    onResetHeight,
  } = props;
  const [isPushing, setIsPushing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showServersOverlayList, setShowServersOverlayList] = useState(false);

  const profileEntries = Object.entries(multiTenantConfig.profiles || {});

  const serversHeaderRef = React.useRef(null);

  const advancedSettingsIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M14.9141 7.708L14.2061 7L9.00006 11.999L14.2061 16.9986L14.9141 16.2906L10.4141 11.999L14.9141 7.708Z"
        fill="currentColor"
        transform="translate(24 0) scale(-1 1)"
      />
    </svg>
  );

  //////////////////////
  // HANDLE FUNCTIONS //
  //////////////////////
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

  const startHeightResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = frameHeight || 600;
    isResizingRef.current = true;
    document.body.classList.add(styles.resizingCursor);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) {
        return;
      }

      const delta = moveEvent.clientY - startY;
      onResizeHeight(startHeight + delta);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.classList.remove(styles.resizingCursor);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const getTokensPreview = () => {
    // send command to figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: 'getTokens',
          role: 'preview',
        } as TokensMessageI,
      },
      '*'
    );
  };

  const getTokensForDownload = () => {
    // send command to figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: 'getTokens',
          role: 'download',
        } as TokensMessageI,
      },
      '*'
    );
  };

  const handleImportTokens = async () => {
    setIsImporting(true);

    try {
      const tokensData = await importTokensFile();

      if (tokensData) {
        // Send tokens to figma controller for import
        parent.postMessage(
          {
            pluginMessage: {
              type: 'importTokens',
              tokens: tokensData,
              role: 'import',
            } as TokensMessageI,
          },
          '*'
        );
      } else {
        setIsImporting(false);
      }
    } catch (error) {
      console.error('Import error:', error);
      toastRef.current?.show({
        title: 'Import Error',
        message: error instanceof Error ? error.message : String(error),
        options: {
          type: 'error',
          timeout: 5000,
        },
      });
      setIsImporting(false);
    }
  };

  const getTokensForPush = () => {
    setIsPushing(true);

    const allEnabledServers = Object.keys(JSONsettingsConfig.servers).filter(
      (serverId) => JSONsettingsConfig.servers[serverId].isEnabled
    );

    console.log('all enebled servers', allEnabledServers);

    // send command to figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: 'getTokens',
          role: 'push',
          server: allEnabledServers,
        } as TokensMessageI,
      },
      '*'
    );
  };

  /////////////////
  // USE EFFECTS //
  /////////////////

  // Receive tokens from figma controller
  useEffect(() => {
    window.onmessage = async (event) => {
      if (!event.data?.pluginMessage) return;
      const { type, tokens, role, server, result } = event.data
        .pluginMessage as TokensMessageI;

      if (type === 'setTokens') {
        if (role === 'preview') {
          // console.log("tokens preview", tokens);
          setGeneratedTokens(tokens);
        }

        if (role === 'download') {
          // console.log("tokens download", tokens);
          downloadTokensFile(
            tokens,
            JSONsettingsConfig.splitByCollection,
            JSONsettingsConfig.splitByMode
          );
        }

        if (role === 'push') {
          if (server.includes('jsonbin')) {
            console.log('push to jsonbin');
            await pushToJSONBin(
              JSONsettingsConfig.servers.jsonbin,
              tokens,
              (params) => {
                toastRef.current?.show(params);
              }
            );
          }

          if (server.includes('github')) {
            // console.log("github config", JSONsettingsConfig.servers.github);
            console.log('push to github');
            await pushToGithub(
              JSONsettingsConfig.servers.github,
              tokens,
              (params) => {
                toastRef.current?.show(params);
              }
            );
          }

          if (server.includes('githubPullRequest')) {
            console.log('create github pull request');
            await githubPullRequest(
              JSONsettingsConfig.servers.githubPullRequest,
              tokens,
              (params) => {
                toastRef.current?.show(params);
              }
            );
          }

          if (server.includes('gitlab')) {
            console.log('push to gitlab');
            await pushToGitlab(
              JSONsettingsConfig.servers.gitlab,
              tokens,
              (params) => {
                toastRef.current?.show(params);
              }
            );
          }

          if (server.includes('customURL')) {
            console.log('push to customURL');
            await pushToCustomURL(JSONsettingsConfig.servers.customURL, tokens);
          }

          setIsPushing(false);
          console.log('push done');
        }
      }

      if (type === 'importResult') {
        setIsImporting(false);

        if (result) {
          toastRef.current?.show({
            title: result.success ? 'Import Successful' : 'Import Failed',
            message: result.message,
            options: {
              type: result.success ? 'success' : 'error',
              timeout: 10000,
            },
          });

          // Log errors if any
          if (result.errors.length > 0) {
            console.error('Import errors:', result.errors);
          }
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
    console.log('JSONsettingsConfig Settings View >>>>', JSONsettingsConfig);
  }, [JSONsettingsConfig]);

  /////////////////
  // MAIN RENDER //
  /////////////////

  const mainView = (
    <>
      <Panel>
        <Stack
          hasLeftRightPadding
          direction="row"
          gap="var(--space-extra-small)"
        >
          <Stack hasLeftRightPadding={false} className={styles.profileDropdown}>
            <Dropdown
              leftIcon={<Icon name="profile" size="32" />}
              value={multiTenantConfig.activeProfileId}
              onChange={(profileId: string) => {
                setActiveProfileId(profileId);
              }}
              optionsSections={[
                {
                  options: profileEntries.map(([profileId, profile]) => ({
                    id: profileId,
                    label: profile.profileName,
                  })),
                },
              ]}
            />
          </Stack>

          <IconButton
            onClick={() => {
              setCurrentView('profileDetail');
            }}
            children={<Icon name="kebab" size="32" />}
          />

          <IconButton
            onClick={() => {
              setCurrentView('newProfile');
            }}
            children={<Icon name="plus" size="32" />}
          />
        </Stack>
      </Panel>

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
            onChange={(value: string) => {
              setJSONsettingsConfig({
                ...JSONsettingsConfig,
                colorMode: value as colorModeType,
              });
            }}
            optionsSections={[
              {
                options: [
                  {
                    id: 'hex',
                    label: 'HEX',
                  },
                ],
              },
              {
                options: [
                  {
                    id: 'rgba-css',
                    label: 'RGBA CSS',
                  },
                  {
                    id: 'rgba-object',
                    label: 'RGBA Object',
                  },
                  {
                    id: 'srgb-dtcg',
                    label: 'sRGB DTCG',
                  },
                ],
              },
              {
                options: [
                  {
                    id: 'hsla-css',
                    label: 'HSLA CSS',
                  },
                  {
                    id: 'hsla-object',
                    label: 'HSLA Object',
                  },
                  {
                    id: 'hsl-dtcg',
                    label: 'HSL DTCG',
                  },
                ],
              },
              {
                options: [
                  {
                    id: 'oklch-dtcg',
                    label: 'OKLCH DTCG',
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
            const styleItem = configStylesList[item.id] || {
              isIncluded: false,
              customName: `${item.label}-styles`,
            };

            // check if style item is included
            const isIncluded = styleItem.isIncluded;

            return (
              <Stack key={index} direction="row" gap="var(--space-extra-small)">
                <Input
                  key={`${multiTenantConfig.activeProfileId}-${item.id}`}
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
                      id: 'none',
                      label: 'Keep separate',
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
        <Stack hasLeftRightPadding>
          <Toggle
            id="use-dtcg"
            checked={JSONsettingsConfig.useDTCG}
            onChange={(checked: boolean) => {
              setJSONsettingsConfig({
                ...JSONsettingsConfig,
                useDTCG: checked,
              });
            }}
          >
            <Text>DTCG 2025.10 format</Text>
          </Toggle>
        </Stack>
      </Panel>

      <Panel>
        <PanelHeader
          title="Advanced settings"
          onClick={() => {
            setCurrentView('advancedSettings');
          }}
          iconButtons={[
            {
              children: (
                <Icon
                  name="caret-right"
                  size="16"
                  customIcon={advancedSettingsIcon}
                />
              ),
              onClick: () => {
                setCurrentView('advancedSettings');
              },
            },
          ]}
        />
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
                      trigger={serversHeaderRef.current ?? undefined}
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

      <Panel hasLeftRightPadding bottomBorder={false}>
        <Stack hasLeftRightPadding hasTopBottomPadding gap="var(--space-small)">
          <Button
            label="Download JSON"
            onClick={getTokensForDownload}
            fullWidth
            secondary
          />
          <Button
            label="Import tokens (Beta)"
            onClick={handleImportTokens}
            loading={isImporting}
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
    if (currentView === 'main') {
      return mainView;
    }

    if (currentView === 'profileDetail') {
      const activeProfileId = multiTenantConfig.activeProfileId;
      return (
        <ProfileDetailView
          profileId={activeProfileId}
          profileName={
            multiTenantConfig.profiles[activeProfileId]?.profileName || ''
          }
          profileCount={profileEntries.length}
          renameProfile={renameProfile}
          deleteProfile={deleteProfile}
          setCurrentView={setCurrentView}
        />
      );
    }

    if (currentView === 'newProfile') {
      return (
        <NewProfileView
          addProfile={addProfile}
          setCurrentView={setCurrentView}
        />
      );
    }

    if (currentView === 'advancedSettings') {
      return (
        <AdvancedSettingsView
          JSONsettingsConfig={JSONsettingsConfig}
          setJSONsettingsConfig={setJSONsettingsConfig}
          setCurrentView={setCurrentView}
        />
      );
    }

    if (currentView === 'jsonbin') {
      return <ServerSettingsView {...commonProps} server="jsonbin" />;
    }

    if (currentView === 'github') {
      return <ServerSettingsView {...commonProps} server="github" />;
    }

    if (currentView === 'gitlab') {
      return <ServerSettingsView {...commonProps} server="gitlab" />;
    }

    if (currentView === 'githubPullRequest') {
      return <ServerSettingsView {...commonProps} server="githubPullRequest" />;
    }

    if (currentView === 'customURL') {
      return <ServerSettingsView {...commonProps} server="customURL" />;
    }
  };

  return (
    <>
      <Toast ref={toastRef} />
      <Stack
        className={`${styles.settingView} ${
          isCodePreviewOpen ? styles.fitHighToFrame : ''
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
          <Stack direction="row" className={styles.about}>
            <a href={config.docsLink} target="_blank">
              <Text>Documentation</Text>
            </a>
            <a href={config.changelogLink} target="_blank">
              <Text>v.{version}</Text>
            </a>
          </Stack>
        </Panel>

        <div
          className={styles.heightResizer}
          onMouseDown={startHeightResize}
          onDoubleClick={onResetHeight}
          title="Drag to resize. Double-click to auto-fit"
        />
      </Stack>
    </>
  );
};
