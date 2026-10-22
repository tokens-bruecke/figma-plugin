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
import { track } from '@app/api/analytics';
import { isPanelLayout, usePluginEnvironment } from '@app/pluginEnvironment';

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
  /** Undefined where the import can't run (Dev Mode) */
  onImportTokens?: () => Promise<void>;
  isImporting: boolean;
  /** Collection names of the open file */
  variableCollections: string[];
  isHidden: boolean;
  sharedProfiles: SharedProfilesI;
  adoptSharedProfile: (sharedId: string) => void;
  updateFromSharedProfile: (profileId: string) => void;
  shareProfileInFile: (profileId: string) => void;
  unshareProfileInFile: (profileId: string) => void;
}

const sharedOptionPrefix = 'shared:';

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
    onImportTokens,
    isImporting,
    variableCollections,
    isHidden,
    sharedProfiles,
    adoptSharedProfile,
    updateFromSharedProfile,
    shareProfileInFile,
    unshareProfileInFile,
  } = props;
  const isPanel = isPanelLayout(usePluginEnvironment());
  const [isPushing, setIsPushing] = useState(false);
  const [showServersOverlayList, setShowServersOverlayList] = useState(false);

  const profileEntries = Object.entries(multiTenantConfig.profiles || {});

  // Shared profiles that have no local copy yet
  const linkedSharedIds = profileEntries.map(([, profile]) => profile.sharedId);
  const unlinkedSharedEntries = Object.entries(sharedProfiles).filter(
    ([sharedId]) => !linkedSharedIds.includes(sharedId)
  );

  const activeProfile =
    multiTenantConfig.profiles[multiTenantConfig.activeProfileId];
  const activeSharedProfile =
    activeProfile?.sharedId && sharedProfiles[activeProfile.sharedId];
  const hasSharedProfileUpdate =
    !!activeSharedProfile &&
    activeSharedProfile.updatedAt > (activeProfile.sharedUpdatedAt ?? 0);

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

  const getTokensForPush = () => {
    setIsPushing(true);

    const allEnabledServers = Object.keys(JSONsettingsConfig.servers).filter(
      (serverId) => JSONsettingsConfig.servers[serverId].isEnabled
    );

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
    const handleMessage = async (event: MessageEvent) => {
      if (!event.data?.pluginMessage) return;
      const { type, tokens, role, server, message } = event.data
        .pluginMessage as TokensMessageI;

      if (type === 'setTokens') {
        if (role === 'preview') {
          // console.log("tokens preview", tokens);
          setGeneratedTokens(tokens);
        }

        if (role === 'download') {
          track('/download');
          downloadTokensFile(
            tokens,
            JSONsettingsConfig.splitByCollection,
            JSONsettingsConfig.splitByMode
          );
        }

        if (role === 'push') {
          const splitOptions = {
            splitByCollection: JSONsettingsConfig.splitByCollection,
            splitByMode: JSONsettingsConfig.splitByMode,
          };
          const showToast = (params: ToastIPropsI) => {
            toastRef.current?.show(params);
          };

          // One failing server must not stop the others or leave the
          // button spinning
          const runPush = async (
            label: string,
            push: () => Promise<unknown>
          ) => {
            try {
              await push();
            } catch (error) {
              console.error(`${label} push failed:`, error);
              showToast({
                title: `${label}: An error occurred`,
                message: error instanceof Error ? error.message : String(error),
                options: {
                  type: 'error',
                },
              });
            }
          };

          try {
            if (server.includes('jsonbin')) {
              track('/push/jsonbin');
              await runPush('JSONBin', () =>
                pushToJSONBin(
                  JSONsettingsConfig.servers.jsonbin,
                  tokens,
                  showToast
                )
              );
            }

            if (server.includes('github')) {
              track('/push/github');
              await runPush('Github', () =>
                pushToGithub(
                  JSONsettingsConfig.servers.github,
                  tokens,
                  showToast,
                  splitOptions
                )
              );
            }

            if (server.includes('githubPullRequest')) {
              track('/push/github-pull-request');
              await runPush('Github', () =>
                githubPullRequest(
                  JSONsettingsConfig.servers.githubPullRequest,
                  tokens,
                  showToast,
                  splitOptions
                )
              );
            }

            if (server.includes('gitlab')) {
              track('/push/gitlab');
              await runPush('Gitlab', () =>
                pushToGitlab(
                  JSONsettingsConfig.servers.gitlab,
                  tokens,
                  showToast,
                  splitOptions
                )
              );
            }

            if (server.includes('customURL')) {
              track('/push/custom-url');
              await runPush('Custom URL', () =>
                pushToCustomURL(
                  JSONsettingsConfig.servers.customURL,
                  tokens,
                  showToast
                )
              );
            }
          } finally {
            setIsPushing(false);
          }
        }
      }

      if (type === 'tokensError') {
        setIsPushing(false);
        toastRef.current?.show({
          title: 'Export failed',
          message: `${message} (see the plugin console for details)`,
          options: {
            type: 'error',
          },
        });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
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

  // The setting is stored in the profile and can name a collection of
  // another file. The export then keeps the styles separate; list it anyway
  // so the dropdown doesn't show an empty value
  const { storeStyleInCollection } = JSONsettingsConfig;
  const styleCollectionOptions = [
    ...variableCollections.map((collection) => ({
      id: collection,
      label: collection,
    })),
    ...(storeStyleInCollection &&
    storeStyleInCollection !== 'none' &&
    !variableCollections.includes(storeStyleInCollection)
      ? [
          {
            id: storeStyleInCollection,
            label: storeStyleInCollection,
            caption: 'Not in this file',
          },
        ]
      : []),
  ];

  const dynamicServerList = serverList.filter((server) => {
    if (!JSONsettingsConfig.servers[server.id]?.isEnabled) {
      return server;
    }
  });

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
                if (profileId.startsWith(sharedOptionPrefix)) {
                  adoptSharedProfile(
                    profileId.slice(sharedOptionPrefix.length)
                  );
                  return;
                }

                setActiveProfileId(profileId);
              }}
              optionsSections={[
                {
                  options: profileEntries.map(([profileId, profile]) => ({
                    id: profileId,
                    label: profile.profileName,
                  })),
                },
                ...(unlinkedSharedEntries.length
                  ? [
                      {
                        title: 'Shared in this file',
                        options: unlinkedSharedEntries.map(
                          ([sharedId, profile]) => ({
                            id: `${sharedOptionPrefix}${sharedId}`,
                            label: profile.profileName,
                          })
                        ),
                      },
                    ]
                  : []),
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

        {hasSharedProfileUpdate && (
          <Stack
            hasLeftRightPadding
            hasTopBottomPadding
            direction="row"
            gap="var(--space-extra-small)"
            className={styles.rowItem}
          >
            <Text className={styles.rowItemText}>
              The shared profile changed in this file.
            </Text>
            <Button
              label="Update"
              secondary
              onClick={() => {
                updateFromSharedProfile(multiTenantConfig.activeProfileId);
              }}
            />
          </Stack>
        )}
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
                // an empty section would still draw its divider
                ...(styleCollectionOptions.length
                  ? [{ options: styleCollectionOptions }]
                  : []),
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
          {onImportTokens ? (
            <Button
              label="Import tokens (Beta)"
              onClick={onImportTokens}
              loading={isImporting}
              fullWidth
              secondary
            />
          ) : (
            <Text className={styles.hint}>
              Importing tokens into variables needs Figma Design and edit
              access. Dev Mode is read-only.
            </Text>
          )}
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
          isShared={!!activeSharedProfile}
          renameProfile={renameProfile}
          deleteProfile={deleteProfile}
          shareProfileInFile={shareProfileInFile}
          unshareProfileInFile={unshareProfileInFile}
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
        className={[
          styles.settingView,
          isPanel ? styles.panelSettingView : '',
          isCodePreviewOpen && !isPanel ? styles.fitHighToFrame : '',
          isHidden ? styles.hidden : '',
        ].join(' ')}
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

        {/* the Inspect panel is resized by the user, not the plugin */}
        {!isPanel && (
          <div
            className={styles.heightResizer}
            onMouseDown={startHeightResize}
            onDoubleClick={onResetHeight}
            title="Drag to resize. Double-click to auto-fit"
          />
        )}
      </Stack>
    </>
  );
};
