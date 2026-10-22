import React, { useState, useEffect } from 'react';

import { useDidUpdate } from './hooks/useDidUpdate';

import { LoadingView } from './views/LoadingView';
import { EmptyView } from './views/EmptyView';
import { SettingsView } from './views/SettingsView';

import { CodePreviewView } from './views/CodePreviewView';
import { Toast, ToastRefI } from './components/Toast';
import { COMPOSED_COLOR_ISSUE_URL } from '@common/transform/tokensToVariables';
import { importTokensFile } from './api/importTokensFile';
import { track } from './api/analytics';
import {
  createDefaultConfig,
  createProfileFromConfig,
  sanitizeMultiTenantConfig,
} from './controller/storageConfig';
import { mergeSharedProfile } from './controller/sharedProfiles';
import {
  PluginEnvironmentContext,
  canImportTokens,
  defaultPluginEnvironment,
  isPanelLayout,
} from './pluginEnvironment';

import styles from './styles.module.scss';

const Container = () => {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  // Lives here rather than in a view: an import from the empty view switches
  // to the settings view, and the result has to survive that switch
  const toastRef = React.useRef<ToastRefI>(null);

  const [generatedTokens, setGeneratedTokens] = useState({});

  const [isLoading, setIsLoading] = useState(true);

  const [frameHeight, setFrameHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [manualFrameHeight, setManualFrameHeight] = useState<number | null>(
    null
  );
  const [isCodePreviewOpen, setIsCodePreviewOpen] = useState(false);

  const [currentView, setCurrentView] = useState('main');
  const [fileHasVariables, setFileHasVariables] = useState(false);
  // Collection names of the open file. Kept out of the stored profile, so
  // the stored config can't overwrite them when it arrives later
  const [variableCollections, setVariableCollections] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Unknown until the controller answers. The views wait for it so that
  // Design-only controls (import) never flash up in Dev Mode
  const [environment, setEnvironment] = useState<PluginEnvironmentI | null>(
    null
  );
  const isPanel = !!environment && isPanelLayout(environment);
  const [sharedProfiles, setSharedProfiles] = useState<SharedProfilesI>({});

  const [multiTenantConfig, setMultiTenantConfig] =
    useState<MultiTenantConfigI>(createDefaultConfig());
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  const activeProfileId = multiTenantConfig.activeProfileId;
  const JSONsettingsConfig =
    (multiTenantConfig.profiles[activeProfileId] as JSONSettingsConfigI) ||
    ({} as JSONSettingsConfigI);

  const setJSONsettingsConfig = (
    updater: React.SetStateAction<JSONSettingsConfigI>
  ) => {
    setMultiTenantConfig((prev) => {
      const currentProfile = prev.profiles[prev.activeProfileId];
      const nextProfile =
        typeof updater === 'function'
          ? (
              updater as (prevState: JSONSettingsConfigI) => JSONSettingsConfigI
            )(currentProfile)
          : updater;

      return {
        ...prev,
        profiles: {
          ...prev.profiles,
          [prev.activeProfileId]: {
            ...nextProfile,
            profileName: currentProfile.profileName,
            updatedAt: Date.now(),
          },
        },
      };
    });
  };

  const setActiveProfileId = (nextProfileId: string) => {
    setMultiTenantConfig((prev) => {
      if (!prev.profiles[nextProfileId]) {
        return prev;
      }

      return {
        ...prev,
        activeProfileId: nextProfileId,
      };
    });
  };

  const addProfile = (profileName: string) => {
    const normalizedProfileName = profileName.trim();

    if (!normalizedProfileName) {
      return;
    }

    setMultiTenantConfig((prev) => {
      const profileId = `profile-${Date.now()}`;
      const nextProfile = createProfileFromConfig(
        normalizedProfileName,
        {} as JSONSettingsConfigI
      );

      return {
        ...prev,
        activeProfileId: profileId,
        profiles: {
          ...prev.profiles,
          [profileId]: nextProfile,
        },
      };
    });
  };

  const renameProfile = (profileId: string, profileName: string) => {
    const normalizedProfileName = profileName.trim();

    if (!normalizedProfileName) {
      return;
    }

    setMultiTenantConfig((prev) => {
      if (!prev.profiles[profileId]) {
        return prev;
      }

      return {
        ...prev,
        profiles: {
          ...prev.profiles,
          [profileId]: {
            ...prev.profiles[profileId],
            profileName: normalizedProfileName,
            updatedAt: Date.now(),
          },
        },
      };
    });
  };

  const deleteProfile = (profileId: string) => {
    setMultiTenantConfig((prev) => {
      if (!prev.profiles[profileId]) {
        return prev;
      }

      const profileIds = Object.keys(prev.profiles);

      if (profileIds.length <= 1) {
        return prev;
      }

      const { [profileId]: _, ...restProfiles } = prev.profiles;
      const nextActiveProfileId =
        prev.activeProfileId === profileId
          ? Object.keys(restProfiles)[0]
          : prev.activeProfileId;

      return {
        ...prev,
        activeProfileId: nextActiveProfileId,
        profiles: restProfiles,
      };
    });
  };

  // A copy of a profile shared in the file. The developer only adds their
  // own credentials
  const adoptSharedProfile = (sharedId: string) => {
    const shared = sharedProfiles[sharedId];

    if (!shared) return;

    setMultiTenantConfig((prev) => {
      const profileId = `profile-${Date.now()}`;

      return {
        ...prev,
        activeProfileId: profileId,
        profiles: {
          ...prev.profiles,
          [profileId]: mergeSharedProfile(undefined, shared, sharedId),
        },
      };
    });

    toastRef.current?.show({
      title: 'Profile added',
      message: `"${shared.profileName}" is now a local profile. Credentials are not shared: add your own token in the server settings before you push.`,
      options: { type: 'success', timeout: 8000 },
    });
  };

  const updateFromSharedProfile = (profileId: string) => {
    setMultiTenantConfig((prev) => {
      const local = prev.profiles[profileId];
      const shared = local?.sharedId && sharedProfiles[local.sharedId];

      if (!shared) return prev;

      return {
        ...prev,
        profiles: {
          ...prev.profiles,
          [profileId]: mergeSharedProfile(local, shared, local.sharedId),
        },
      };
    });
  };

  const linkSharedProfile = (
    profileId: string,
    link: Pick<SettingsProfileI, 'sharedId' | 'sharedUpdatedAt'>
  ) => {
    setMultiTenantConfig((prev) => {
      if (!prev.profiles[profileId]) return prev;

      return {
        ...prev,
        profiles: {
          ...prev.profiles,
          [profileId]: { ...prev.profiles[profileId], ...link },
        },
      };
    });
  };

  const shareProfileInFile = (profileId: string) => {
    const profile = multiTenantConfig.profiles[profileId];

    if (!profile) return;

    const sharedId = profile.sharedId ?? `shared-${Date.now()}`;
    const updatedAt = Date.now();

    // The controller strips the credentials before it stores anything
    parent.postMessage(
      {
        pluginMessage: { type: 'shareProfile', sharedId, profile, updatedAt },
      },
      '*'
    );
    linkSharedProfile(profileId, { sharedId, sharedUpdatedAt: updatedAt });
  };

  const unshareProfileInFile = (profileId: string) => {
    const sharedId = multiTenantConfig.profiles[profileId]?.sharedId;

    if (!sharedId) return;

    parent.postMessage(
      { pluginMessage: { type: 'unshareProfile', sharedId } },
      '*'
    );
    linkSharedProfile(profileId, {
      sharedId: undefined,
      sharedUpdatedAt: undefined,
    });
  };

  const commonProps = {
    JSONsettingsConfig,
    setJSONsettingsConfig,
    setCurrentView,
    multiTenantConfig,
    setActiveProfileId,
    addProfile,
    renameProfile,
    deleteProfile,
    sharedProfiles,
    adoptSharedProfile,
    updateFromSharedProfile,
    shareProfileInFile,
    unshareProfileInFile,
  };

  //////////////////////
  // HANDLE FUNCTIONS //
  //////////////////////

  const handleImportTokens = async () => {
    setIsImporting(true);

    try {
      const tokensData = await importTokensFile();

      if (tokensData) {
        track('/import');
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

  /////////////////
  // USE EFFECTS //
  /////////////////

  // Load stored config and collections from Figma
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data?.pluginMessage;
      if (!message) return;

      const { type, hasVariables, variableCollections, storageConfig, result } =
        message;

      if (type === 'pluginEnvironment') {
        setEnvironment(message.environment);
      }

      if (type === 'sharedProfiles') {
        setSharedProfiles(message.sharedProfiles || {});
      }

      if (type === 'sharedProfilesError') {
        toastRef.current?.show({
          title: 'Could not update the shared profiles',
          message: message.message,
          options: { type: 'error' },
        });
      }

      if (type === 'importResult') {
        setIsImporting(false);

        if (result) {
          const hasIssues = result.errors.length > 0;
          toastRef.current?.show({
            title: result.success
              ? hasIssues
                ? 'Imported with issues'
                : 'Import Successful'
              : 'Import Failed',
            message: result.message,
            ...(result.composedColorsRejected > 0 && {
              link: {
                label: 'Figma issue #375: update Figma to import these',
                url: COMPOSED_COLOR_ISSUE_URL,
              },
            }),
            options: {
              type: result.success ? (hasIssues ? 'warn' : 'success') : 'error',
              // leave time to read the issues
              timeout: hasIssues ? 60000 : 10000,
            },
          });

          // Log errors if any
          if (result.errors.length > 0) {
            console.error('Import errors:', result.errors);
          }
        }
      }

      // stored config arrives first; only then may the UI write back
      if (type === 'storageConfig') {
        if (storageConfig) {
          setMultiTenantConfig(sanitizeMultiTenantConfig(storageConfig));
        }
        setIsStorageLoaded(true);
      }

      // check if file has variables
      if (type === 'checkForVariables') {
        setFileHasVariables(hasVariables);
        setIsLoading(false);

        track(hasVariables ? '/ready' : '/empty');

        setVariableCollections(variableCollections || []);
      }
    };

    window.addEventListener('message', handleMessage);

    track('/', false);

    parent.postMessage(
      { pluginMessage: { type: 'getPluginEnvironment' } },
      '*'
    );
    parent.postMessage({ pluginMessage: { type: 'getStorageConfig' } }, '*');
    parent.postMessage({ pluginMessage: { type: 'getSharedProfiles' } }, '*');
    parent.postMessage({ pluginMessage: { type: 'checkForVariables' } }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Check if the view was changed
  useEffect(() => {
    // The Inspect panel can't be resized by the plugin
    if (!environment || isPanel) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { height } = entries[0].contentRect;

      // Don't track content height while preview is open — the flex row
      // includes the preview pane and doesn't represent SettingsView height.
      if (isCodePreviewOpen) return;

      setContentHeight(height);
      setFrameHeight(height);

      if (manualFrameHeight !== null) return;

      parent.postMessage(
        {
          pluginMessage: {
            type: 'resizeUIHeight',
            height,
          },
        },
        '*'
      );
    });

    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isCodePreviewOpen, manualFrameHeight, environment, isPanel]);

  useEffect(() => {
    if (manualFrameHeight === null) {
      return;
    }

    parent.postMessage(
      {
        pluginMessage: {
          type: 'resizeUIHeight',
          height: manualFrameHeight,
        },
      },
      '*'
    );
  }, [manualFrameHeight]);

  useEffect(() => {
    if (manualFrameHeight === null || contentHeight <= 0) {
      return;
    }

    const maxHeight = Math.max(360, Math.round(contentHeight));

    if (manualFrameHeight > maxHeight) {
      setManualFrameHeight(maxHeight);
      setFrameHeight(maxHeight);
    }
  }, [manualFrameHeight, contentHeight]);

  // pass changes to figma controller, but never before the stored
  // config has been loaded, otherwise defaults would overwrite it
  useDidUpdate(() => {
    if (!isStorageLoaded) return;

    parent.postMessage(
      {
        pluginMessage: {
          type: 'JSONSettingsConfig',
          config: multiTenantConfig,
        },
      },
      '*'
    );
  }, [multiTenantConfig, isStorageLoaded]);

  // handle code preview
  useDidUpdate(() => {
    if (isPanel) return;

    parent.postMessage(
      {
        pluginMessage: {
          type: 'openCodePreview',
          isCodePreviewOpen,
          height: manualFrameHeight ?? frameHeight,
        },
      },
      '*'
    );
  }, [isCodePreviewOpen]);

  const handleResizeHeight = (height: number) => {
    const maxHeight = Math.max(360, Math.round(contentHeight || frameHeight));
    const nextHeight = Math.round(Math.max(360, Math.min(height, maxHeight)));
    setManualFrameHeight(nextHeight);
    setFrameHeight(nextHeight);
  };

  const handleResetHeight = () => {
    const nextHeight = Math.max(360, Math.round(contentHeight));
    setManualFrameHeight(null);
    setFrameHeight(nextHeight);

    parent.postMessage(
      {
        pluginMessage: {
          type: 'resizeUIHeight',
          height: nextHeight,
        },
      },
      '*'
    );
  };

  /////////////////////
  // RENDER FUNCTION //
  /////////////////////

  const renderView = () => {
    if (isLoading || !environment) {
      return <LoadingView />;
    }

    const onImportTokens = canImportTokens(environment)
      ? handleImportTokens
      : undefined;

    if (!fileHasVariables) {
      return (
        <EmptyView
          setFileHasVariables={setFileHasVariables}
          onImportTokens={onImportTokens}
          isImporting={isImporting}
        />
      );
    }

    // In the panel the preview replaces the settings instead of sitting
    // beside them. The settings stay mounted: they receive the tokens
    const isSettingsHidden = isPanel && isCodePreviewOpen;

    return (
      <SettingsView
        {...commonProps}
        isHidden={isSettingsHidden}
        onImportTokens={onImportTokens}
        isImporting={isImporting}
        variableCollections={variableCollections}
        isCodePreviewOpen={isCodePreviewOpen}
        setIsCodePreviewOpen={setIsCodePreviewOpen}
        setGeneratedTokens={setGeneratedTokens}
        currentView={currentView}
        frameHeight={manualFrameHeight ?? frameHeight}
        onResizeHeight={handleResizeHeight}
        onResetHeight={handleResetHeight}
      />
    );
  };

  // In Figma for VS Code, target="_blank" links do nothing. Route them all
  // through figma.openExternal instead of touching every link
  const handleLinkClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!environment?.isVSCode) return;

    const link = (event.target as HTMLElement).closest?.(
      'a[target="_blank"]'
    ) as HTMLAnchorElement | null;

    if (!link?.href) return;

    event.preventDefault();
    parent.postMessage(
      { pluginMessage: { type: 'openExternal', url: link.href } },
      '*'
    );
  };

  return (
    <PluginEnvironmentContext.Provider
      value={environment ?? defaultPluginEnvironment}
    >
      <div
        ref={wrapperRef}
        className={`${styles.container} ${isPanel ? styles.panelLayout : ''}`}
        onClickCapture={handleLinkClick}
      >
        <Toast ref={toastRef} />
        {renderView()}
        {isCodePreviewOpen && (
          <CodePreviewView
            generatedTokens={generatedTokens}
            onClose={isPanel ? () => setIsCodePreviewOpen(false) : undefined}
          />
        )}
      </div>
    </PluginEnvironmentContext.Provider>
  );
};

export default Container;
