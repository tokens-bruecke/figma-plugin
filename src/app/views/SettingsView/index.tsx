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
  LoadingIndicator,
  Text,
  Toggle,
  OverlayList,
} from 'react-figma-ui/ui';

import { config } from '@app/controller/config';

import { Toast, ToastRefI } from '@app/components/Toast';
import { AdvancedSettingsView } from '@app/views/AdvancedSettingsView';
import { DownloadSettingsView } from '@app/views/DownloadSettingsView';
import { CollectionsView } from '@app/views/CollectionsView';
import { ServerSettingsView } from '@app/views/ServerSettingsView';
import { getServerSummary } from '@app/views/ServerSettingsView/providers';
import { ProfileDetailView } from '@app/views/ProfileDetailView';
import { NewProfileView } from '@app/views/NewProfileView';

import { pushToJSONBin } from '@app/api/servers/pushToJSONBin';
import { pushToGithub } from '@app/api/servers/pushToGithub';
import { githubPullRequest } from '@app/api/servers/githubPullRequest';
import { pushToGitlab } from '@app/api/servers/pushToGitlab';
import { gitlabMergeRequest } from '@app/api/servers/gitlabMergeRequest';
import { pushToCustomURL } from '@app/api/servers/pushToCustomURL';

import {
  PullResultI,
  getPulledCollections,
  isGitServer,
} from '@app/api/servers/pullFromGit';
import {
  getServerPullSource,
  pullFromServer,
} from '@app/api/servers/pullFromServer';

import { downloadTokensFile } from '@app/api/downloadTokensFile';
import { getSplitOptions } from '@common/transform/splitTokensIntoFiles';
import type { PushSelectionI } from '@app/views/CodePreviewView';
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
  /** Tells the Output preview which collections a push leaves out */
  onPushSelectionChange?: (selection: PushSelectionI | null) => void;
  currentView: string;
  frameHeight: number;
  onResizeHeight: (height: number) => void;
  onResetHeight: () => void;
  /** Undefined where the import can't run (Dev Mode) */
  onImportTokens?: () => Promise<void>;
  /** Imports tokens documents, e.g. pulled files. Undefined in Dev Mode */
  onImportTokenDocuments?: (tokens: any[]) => void;
  isImporting: boolean;
  /** The file has no variables yet: open on Import, where they come from */
  hasNoVariables?: boolean;
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

// Export writes tokens out and never changes the file; Import writes tokens
// into its variables. Kept apart so the settings of the export don't look
// like they shape an import
type ModeType = 'export' | 'import';

const modeOptions: { value: ModeType; label: string }[] = [
  { value: 'export', label: 'Export' },
  { value: 'import', label: 'Import' },
];

// The servers that write one file per collection when the tokens are split
const gitServerIds: ServerType[] = [
  'github',
  'githubPullRequest',
  'gitlab',
  'gitlabMergeRequest',
];

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

// Captions tell the two GitHub and the two GitLab targets apart before one
// is picked
const serverList = [
  {
    id: 'jsonbin',
    label: 'JSONBin',
    iconName: 'jsonbin',
  },
  {
    id: 'github',
    label: 'GitHub',
    caption: 'Commit',
    iconName: 'github',
  },
  {
    id: 'githubPullRequest',
    label: 'GitHub PR',
    caption: 'Pull request',
    iconName: 'github',
  },
  {
    id: 'gitlab',
    label: 'GitLab',
    caption: 'Commit',
    iconName: 'gitlab',
  },
  {
    id: 'gitlabMergeRequest',
    label: 'GitLab MR',
    caption: 'Merge request',
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
    onPushSelectionChange,
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
    onImportTokenDocuments,
    isImporting,
    hasNoVariables = false,
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
  const [mode, setMode] = useState<ModeType>(
    hasNoVariables ? 'import' : 'export'
  );
  // Dev Mode can't import, so it only has the export
  const isImportMode = !!onImportTokens && mode === 'import';
  const [showServersOverlayList, setShowServersOverlayList] = useState(false);
  // Advanced settings opens from the main view and from Download settings,
  // and its back button returns to where it was opened
  const [advancedSettingsBackView, setAdvancedSettingsBackView] =
    useState('main');
  const [showPullServersOverlayList, setShowPullServersOverlayList] =
    useState(false);
  // The server whose files are being fetched
  const [pullingServer, setPullingServer] = useState<ServerType | null>(null);
  // Fetched files waiting for the user to confirm the import
  const [pendingPull, setPendingPull] = useState<
    (PullResultI & { server: ServerType }) | null
  >(null);
  // The server whose pulled files are being imported
  const [importingServer, setImportingServer] = useState<ServerType | null>(
    null
  );

  useEffect(() => {
    if (!isImporting) setImportingServer(null);
  }, [isImporting]);

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
  // Not `>`: the timestamps come from the clocks of different people
  const hasSharedProfileUpdate =
    !!activeSharedProfile &&
    activeSharedProfile.updatedAt !== activeProfile.sharedUpdatedAt;

  const serversHeaderRef = React.useRef(null);
  const pullServersHeaderRef = React.useRef(null);
  // Where a server form was opened from: one added on the Import tab only
  // pulls until "Use for pulling only" is unchecked
  const [serverOrigin, setServerOrigin] = useState<ModeType>('export');

  // Variables appeared, so an import worked: what's left is the export
  const hadNoVariablesRef = React.useRef(hasNoVariables);
  useEffect(() => {
    if (hadNoVariablesRef.current && !hasNoVariables) setMode('export');
    hadNoVariablesRef.current = hasNoVariables;
  }, [hasNoVariables]);

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
  const openAdvancedSettings = (backView: string) => {
    setAdvancedSettingsBackView(backView);
    setCurrentView('advancedSettings');
  };

  // the container opens the pane first and only then asks for the tokens
  const handleShowOutput = () => {
    setIsCodePreviewOpen(!isCodePreviewOpen);
  };

  const handleModeChange = (value: string) => {
    // A file without variables opens on Import; only a click counts
    if (value === 'import' && mode !== 'import') {
      track('/import-tab');
    }

    setMode(value as ModeType);
    // The output belongs to the export
    if (value === 'import' && isCodePreviewOpen) {
      setIsCodePreviewOpen(false);
    }
  };

  const handleShowServersOverlayList = () => {
    setShowServersOverlayList(!showServersOverlayList);
  };

  const handleShowPullServersOverlayList = () => {
    setShowPullServersOverlayList(!showPullServersOverlayList);
  };

  const handleServerView = (serverId: string) => {
    setServerOrigin('export');
    props.setCurrentView(serverId);
  };

  const handlePullServerView = (serverId: string) => {
    setServerOrigin('import');
    props.setCurrentView(serverId);
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

  // Only the servers this version knows. A profile saved by a newer version
  // can hold servers this one doesn't have; they stay stored, untouched
  const enabledServers = serverList.filter(
    (server) => JSONsettingsConfig.servers[server.id]?.isEnabled
  );

  // A GitHub or GitLab server added on the Import tab only pulls
  const isPullOnly = (serverId: string) =>
    !!(JSONsettingsConfig.servers[serverId] as { pullOnly?: boolean })
      ?.pullOnly;

  const pushServers = enabledServers.filter((server) => !isPullOnly(server.id));

  // Added on the Export tab with "Use for pushing only"
  const isPushOnly = (serverId: string) =>
    !!(JSONsettingsConfig.servers[serverId] as { pushOnly?: boolean })
      ?.pushOnly;

  // Every server can be pulled from. None where the import can't run (Dev
  // Mode)
  const pullServers = onImportTokenDocuments
    ? enabledServers
        .filter((server) => !isPushOnly(server.id))
        .map((server) => ({
          ...server,
          id: server.id as ServerType,
        }))
    : [];

  const serverLabel = (server: ServerType) =>
    serverList.find((item) => item.id === server)?.label ?? server;

  // Fetching its files, or importing them
  const isServerBusy = (server: ServerType) =>
    pullingServer === server || (isImporting && importingServer === server);

  const handlePull = async (server: ServerType) => {
    setPendingPull(null);
    setPullingServer(server);

    try {
      // The same files a push writes, without the excluded collections
      const result = await pullFromServer(
        server,
        JSONsettingsConfig.servers,
        getSplitOptions(JSONsettingsConfig)
      );
      setPendingPull({ ...result, server });
    } catch (error) {
      console.error('Pull error:', error);
      // Only the server type, never the error, which can name the repository
      track(`/pull-failed/${server}`);
      toastRef.current?.show({
        title: `${serverLabel(server)}: Could not pull tokens`,
        message: error instanceof Error ? error.message : String(error),
        options: { type: 'error' },
      });
    } finally {
      setPullingServer(null);
    }
  };

  const confirmPull = () => {
    if (!pendingPull || !onImportTokenDocuments) return;

    track(`/pull/${pendingPull.server}`);
    setImportingServer(pendingPull.server);
    onImportTokenDocuments(pendingPull.files.map((file) => file.tokens));
    setPendingPull(null);
  };

  const pendingPullSummary = (() => {
    if (!pendingPull) return '';

    const count = pendingPull.files.length;
    const collections = getPulledCollections(pendingPull.files);
    const names =
      collections.length > 3
        ? `${collections.slice(0, 3).join(', ')} and ${
            collections.length - 3
          } more`
        : collections.join(', ');

    return `Import ${count} ${count === 1 ? 'file' : 'files'}${
      names ? ` (${names})` : ''
    } from ${pendingPull.source}?`;
  })();

  const getTokensForPush = () => {
    setIsPushing(true);

    const allEnabledServers = pushServers.map((server) => server.id);

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
            JSONsettingsConfig.splitByMode,
            JSONsettingsConfig.downloadFileName
          );
        }

        if (role === 'push') {
          const splitOptions = getSplitOptions(JSONsettingsConfig);

          // Once per push, next to the per-server events: some collections
          // were left out of a Git push
          if (
            splitOptions.excludedCollections?.length &&
            gitServerIds.some((serverId) => server.includes(serverId))
          ) {
            track('/push/partial');
          }

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
              await runPush('JSONBin', async () => {
                const result = await pushToJSONBin(
                  JSONsettingsConfig.servers.jsonbin,
                  tokens,
                  showToast
                );
                const binId = result?.metadata?.id;

                // Keep the new bin's id, so the next push updates this bin
                // instead of creating another one
                if (binId && !JSONsettingsConfig.servers.jsonbin.id) {
                  setJSONsettingsConfig((prevState) => ({
                    ...prevState,
                    servers: {
                      ...prevState.servers,
                      jsonbin: { ...prevState.servers.jsonbin, id: binId },
                    },
                  }));
                }
              });
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
              await runPush('Github PR', () =>
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

            if (server.includes('gitlabMergeRequest')) {
              track('/push/gitlab-merge-request');
              await runPush('Gitlab MR', () =>
                gitlabMergeRequest(
                  JSONsettingsConfig.servers.gitlabMergeRequest,
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

  const isAllServersEnabled = pushServers.length === serverList.length;

  const isAnyServerEnabled = pushServers.length > 0;

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

  // Only the Git servers write a file per collection, and only while the
  // tokens are split with collection names. JSONBin and a custom URL always
  // receive the whole export
  const hasCollectionFiles =
    (JSONsettingsConfig.splitByCollection || JSONsettingsConfig.splitByMode) &&
    !JSONsettingsConfig.omitCollectionNames &&
    variableCollections.length > 1;
  const isCollectionRowShown =
    hasCollectionFiles &&
    pushServers.some((server) =>
      gitServerIds.includes(server.id as ServerType)
    );
  const isPullCollectionRowShown =
    hasCollectionFiles && pullServers.some((server) => isGitServer(server.id));
  const pushedCollections = variableCollections.filter(
    (collection) =>
      !(JSONsettingsConfig.excludedCollections ?? []).includes(collection)
  );
  const isPartialPush =
    isCollectionRowShown &&
    pushedCollections.length < variableCollections.length;
  const collectionSummary = !isPartialPush
    ? 'All collections'
    : pushedCollections.length
    ? pushedCollections.join(', ')
    : 'None';
  // Says on the button when some are left out, so a push that skips them is
  // no surprise
  const pushLabel = isPartialPush
    ? `Push ${pushedCollections.length} of ${variableCollections.length} collections`
    : 'Push to server';

  // The Output preview can then show only what a push commits. A string key,
  // so the effect runs when the selection changes, not on every render
  const pushSelectionKey = isPartialPush
    ? JSON.stringify([
        getSplitOptions(JSONsettingsConfig),
        pushedCollections.length,
        variableCollections.length,
      ])
    : '';

  useEffect(() => {
    if (!onPushSelectionChange) return;

    if (!pushSelectionKey) {
      onPushSelectionChange(null);
      return;
    }

    const [splitOptions, pushedCount, totalCount] =
      JSON.parse(pushSelectionKey);
    onPushSelectionChange({ splitOptions, pushedCount, totalCount });
  }, [pushSelectionKey]);

  // Without the settings there's no selection to follow
  useEffect(() => () => onPushSelectionChange?.(null), []);

  // A pull-only server is offered too: its form then turns pushing on
  const dynamicServerList = serverList.filter(
    (server) => !pushServers.includes(server)
  );

  // A pull reads one branch, whether pushes commit or open a pull request,
  // so the Import tab offers no PR or MR server
  const pullServerOptions = serverList
    .filter(
      (server) =>
        server.id !== 'githubPullRequest' &&
        server.id !== 'gitlabMergeRequest' &&
        (!JSONsettingsConfig.servers[server.id]?.isEnabled ||
          isPushOnly(server.id))
    )
    .map(({ caption: _caption, ...server }) => server);

  /////////////////
  // MAIN RENDER //
  /////////////////

  // Picks the collections a push writes and a pull reads, so both modes show it
  const collectionsRow = (
    <Stack
      className={[styles.rowItem, styles.collectionsRow].join(' ')}
      hasLeftRightPadding={false}
      direction="row"
      onClick={() => setCurrentView('collections')}
      gap={1}
    >
      <Icon name="library" size="32" />
      <div className={[styles.rowItemText, styles.serverText].join(' ')}>
        <Text>Collections</Text>
        <Text className={styles.serverSummary}>{collectionSummary}</Text>
      </div>
      <IconButton
        onClick={() => setCurrentView('collections')}
        children={
          <Icon
            name="caret-right"
            size="16"
            customIcon={advancedSettingsIcon}
          />
        }
      />
    </Stack>
  );

  // The profile menu also opens the new profile and profile settings views,
  // which had their own buttons before the tabs shared this row
  const newProfileOption = '__new-profile';
  const profileSettingsOption = '__profile-settings';

  const handleProfileMenu = (id: string) => {
    if (id === newProfileOption) {
      setCurrentView('newProfile');
      return;
    }

    if (id === profileSettingsOption) {
      setCurrentView('profileDetail');
      return;
    }

    if (id.startsWith(sharedOptionPrefix)) {
      adoptSharedProfile(id.slice(sharedOptionPrefix.length));
      return;
    }

    setActiveProfileId(id);
  };

  // The tabs on the left and the profile both tabs use on the right. Dev Mode
  // can't import, so it shows only the profile
  const profilePanel = (
    <Panel>
      <Stack
        hasLeftRightPadding
        direction="row"
        gap="var(--space-extra-small)"
        className={styles.modeBar}
      >
        {onImportTokens && (
          <div className={styles.modeTabs} role="tablist">
            {modeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={mode === option.value}
                className={[
                  styles.modeTab,
                  mode === option.value && styles.modeTabActive,
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleModeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <Dropdown
          className={styles.profileMenu}
          value={multiTenantConfig.activeProfileId}
          onChange={handleProfileMenu}
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
            {
              options: [
                { id: newProfileOption, label: 'New profile…' },
                { id: profileSettingsOption, label: 'Profile settings…' },
              ],
            },
          ]}
        />
      </Stack>

      {hasSharedProfileUpdate && (
        <Stack
          hasTopBottomPadding
          direction="row"
          gap="var(--space-extra-small)"
          className={styles.sharedUpdate}
        >
          <Text className={styles.sharedUpdateText}>
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
  );

  const exportPanels = (
    <>
      <Panel>
        <PanelHeader
          title="Show output"
          onClick={handleShowOutput}
          iconButtons={[
            {
              // In the panel layout the preview replaces the settings like a
              // subview, so the sidebar icon would be misleading there.
              children: isPanel ? (
                <Icon
                  name="caret-right"
                  size="16"
                  customIcon={advancedSettingsIcon}
                />
              ) : (
                <Icon name="sidebar" size="32" />
              ),
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
            openAdvancedSettings('main');
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
                openAdvancedSettings('main');
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
              {pushServers.map((server) => {
                const serverId = server.id;

                return (
                  <Stack
                    className={styles.rowItem}
                    key={serverId}
                    hasLeftRightPadding={false}
                    direction="row"
                    onClick={() => handleServerView(serverId)}
                    gap={1}
                  >
                    <Icon name={server.iconName} size="32" />
                    <div
                      className={[styles.rowItemText, styles.serverText].join(
                        ' '
                      )}
                    >
                      <Text>{server.label}</Text>
                      <Text className={styles.serverSummary}>
                        {getServerSummary(
                          serverId as ServerType,
                          JSONsettingsConfig.servers[serverId]
                        )}
                      </Text>
                    </div>
                    <IconButton
                      onClick={() => handleServerView(serverId)}
                      children={
                        <Icon
                          name="caret-right"
                          size="16"
                          customIcon={advancedSettingsIcon}
                        />
                      }
                    />
                  </Stack>
                );
              })}
            </Stack>

            {isCollectionRowShown && collectionsRow}

            <Stack>
              <Button
                loading={isPushing}
                label={pushLabel}
                onClick={getTokensForPush}
                fullWidth
              />
            </Stack>
          </Stack>
        )}
      </Panel>

      <Panel hasLeftRightPadding bottomBorder={false}>
        <Stack hasLeftRightPadding hasTopBottomPadding gap="var(--space-small)">
          <div className={styles.downloadRow}>
            <div className={styles.downloadButton}>
              <Button
                label="Download JSON"
                onClick={getTokensForDownload}
                fullWidth
                secondary
              />
            </div>
            <button
              type="button"
              className={styles.downloadMore}
              aria-label="Download settings"
              title="Download settings"
              onClick={() => setCurrentView('downloadSettings')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
                <circle cx="7" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="17" cy="12" r="1" fill="currentColor" />
              </svg>
            </button>
          </div>
          {!onImportTokens && (
            <Text className={styles.hint}>
              Importing tokens into variables needs Figma Design and edit
              access. Dev Mode is read-only.
            </Text>
          )}
        </Stack>
      </Panel>
    </>
  );

  const importPanels = (
    <>
      {hasNoVariables && (
        <Panel>
          <Stack hasLeftRightPadding hasTopBottomPadding>
            <Text className={styles.pullHint}>
              This file has no variables yet.
            </Text>
          </Stack>
        </Panel>
      )}

      <Panel>
        <PanelHeader
          ref={pullServersHeaderRef}
          title="Pull from server"
          isActive
          onClick={
            pullServerOptions.length
              ? handleShowPullServersOverlayList
              : undefined
          }
          iconButtons={[
            {
              disabled: !pullServerOptions.length,
              children: (
                <>
                  <Icon name="plus" size="32" />
                  {showPullServersOverlayList && (
                    <OverlayList
                      trigger={pullServersHeaderRef.current ?? undefined}
                      className={styles.overlayPullServerList}
                      onOutsideClick={handleShowPullServersOverlayList}
                      onClick={handlePullServerView}
                      optionsSections={[{ options: pullServerOptions }]}
                    />
                  )}
                </>
              ),
              onClick: handleShowPullServersOverlayList,
            },
          ]}
        />

        <Stack hasLeftRightPadding hasTopBottomPadding gap="var(--space-small)">
          {pullServers.length ? (
            <Stack hasLeftRightPadding={false} gap="var(--space-extra-small)">
              {pullServers.map((server) => (
                <Stack
                  className={styles.rowItem}
                  key={server.id}
                  hasLeftRightPadding={false}
                  direction="row"
                  onClick={() => handlePullServerView(server.id)}
                  gap={1}
                >
                  <Icon name={server.iconName} size="32" />
                  <div
                    className={[styles.rowItemText, styles.serverText].join(
                      ' '
                    )}
                  >
                    <Text>{server.label}</Text>
                    <Text className={styles.serverSummary}>
                      {getServerPullSource(
                        server.id,
                        JSONsettingsConfig.servers[server.id]
                      )}
                    </Text>
                  </div>
                  {/* The row opens the server's settings, the icon pulls */}
                  <button
                    type="button"
                    className={[
                      styles.pullIconButton,
                      isServerBusy(server.id) && styles.pullIconButtonBusy,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    title={`Pull from ${getServerPullSource(
                      server.id,
                      JSONsettingsConfig.servers[server.id]
                    )}`}
                    aria-label={`Pull from ${server.label}`}
                    aria-busy={isServerBusy(server.id)}
                    disabled={!!pullingServer || isImporting}
                    onClick={(event) => {
                      event.stopPropagation();
                      handlePull(server.id);
                    }}
                  >
                    {isServerBusy(server.id) ? (
                      <LoadingIndicator />
                    ) : (
                      <Icon name="refresh" size="16" />
                    )}
                  </button>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Text className={`${styles.hint} ${styles.pullHint}`}>
              Connect a repository, a JSONBin bin or your own server with + to
              pull its tokens into this file.
            </Text>
          )}

          {isPullCollectionRowShown && collectionsRow}

          {pendingPull && (
            <Stack hasLeftRightPadding={false} gap="var(--space-extra-small)">
              <Text className={styles.pullSummary}>{pendingPullSummary}</Text>
              <Stack
                hasLeftRightPadding={false}
                direction="row"
                gap="var(--space-extra-small)"
                className={styles.pullActions}
              >
                <Button
                  label="Cancel"
                  secondary
                  onClick={() => setPendingPull(null)}
                />
                <Button label="Import" onClick={confirmPull} />
              </Stack>
            </Stack>
          )}
        </Stack>
      </Panel>

      <Panel hasLeftRightPadding bottomBorder={false}>
        <Stack hasLeftRightPadding hasTopBottomPadding gap="var(--space-small)">
          <Button
            label="Import from JSON file"
            onClick={onImportTokens}
            loading={isImporting && !importingServer}
            disabled={isImporting && !!importingServer}
            fullWidth
            secondary
          />
        </Stack>
      </Panel>
    </>
  );

  const mainView = (
    <>
      {profilePanel}
      {isImportMode ? importPanels : exportPanels}
    </>
  );

  // Select which view to render
  // based on currentView state

  const commonProps = {
    JSONsettingsConfig,
    setJSONsettingsConfig,
    setCurrentView,
    showToast: (params: ToastIPropsI) => toastRef.current?.show(params),
    variableCollections,
    openedFrom: serverOrigin,
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
          backView={advancedSettingsBackView}
        />
      );
    }

    if (currentView === 'downloadSettings') {
      return (
        <DownloadSettingsView
          JSONsettingsConfig={JSONsettingsConfig}
          setJSONsettingsConfig={setJSONsettingsConfig}
          setCurrentView={setCurrentView}
          openAdvancedSettings={() => openAdvancedSettings('downloadSettings')}
        />
      );
    }

    if (currentView === 'collections') {
      return (
        <CollectionsView
          JSONsettingsConfig={JSONsettingsConfig}
          setJSONsettingsConfig={setJSONsettingsConfig}
          setCurrentView={setCurrentView}
          variableCollections={variableCollections}
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

    if (currentView === 'gitlabMergeRequest') {
      return (
        <ServerSettingsView {...commonProps} server="gitlabMergeRequest" />
      );
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
