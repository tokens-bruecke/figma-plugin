import React, { useState, useEffect } from 'react';

import { useDidUpdate } from './hooks/useDidUpdate';

import { LoadingView } from './views/LoadingView';
import { EmptyView } from './views/EmptyView';
import { SettingsView } from './views/SettingsView';

import { CodePreviewView } from './views/CodePreviewView';
import { importTokensFile } from './api/importTokensFile';
import { track } from './api/analytics';
import {
  createDefaultConfig,
  createProfileFromConfig,
  sanitizeMultiTenantConfig,
} from './controller/storageConfig';

import styles from './styles.module.scss';

const Container = () => {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

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
  const [isImporting, setIsImporting] = useState(false);

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

  const commonProps = {
    JSONsettingsConfig,
    setJSONsettingsConfig,
    setCurrentView,
    multiTenantConfig,
    setActiveProfileId,
    addProfile,
    renameProfile,
    deleteProfile,
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

      const { type, hasVariables, variableCollections, storageConfig } =
        message;

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

        if (hasVariables) {
          setMultiTenantConfig((prev) => ({
            ...prev,
            profiles: Object.keys(prev.profiles).reduce(
              (acc, profileId) => {
                acc[profileId] = {
                  ...prev.profiles[profileId],
                  variableCollections,
                };
                return acc;
              },
              {} as Record<ProfileId, SettingsProfileI>
            ),
          }));
        }
      }
    };

    window.addEventListener('message', handleMessage);

    track('/', false);

    parent.postMessage({ pluginMessage: { type: 'getStorageConfig' } }, '*');
    parent.postMessage({ pluginMessage: { type: 'checkForVariables' } }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Check if the view was changed
  useEffect(() => {
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
  }, [isCodePreviewOpen, manualFrameHeight]);

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
    if (isLoading) {
      return <LoadingView />;
    }

    if (!fileHasVariables) {
      return (
        <EmptyView
          setFileHasVariables={setFileHasVariables}
          onImportTokens={handleImportTokens}
          isImporting={isImporting}
        />
      );
    }

    return (
      <SettingsView
        {...commonProps}
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

  return (
    <div ref={wrapperRef} className={styles.container}>
      {renderView()}
      {isCodePreviewOpen && (
        <CodePreviewView generatedTokens={generatedTokens} />
      )}
    </div>
  );
};

export default Container;
