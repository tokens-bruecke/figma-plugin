const createDefaultJSONSettingsConfig = (): JSONSettingsConfigI => ({
  includedStyles: {
    text: {
      isIncluded: false,
      customName: 'Typography-styles',
    },
    effects: {
      isIncluded: false,
      customName: 'Effect-styles',
    },
    grids: {
      isIncluded: false,
      customName: 'Grid-styles',
    },
    colors: {
      isIncluded: false,
      customName: 'Color-styles',
    },
  },
  variableCollections: [],
  storeStyleInCollection: 'none',
  colorMode: 'hex',
  includeScopes: false,
  useDTCGKeys: false,
  includeValueStringKeyToAlias: false,
  includeFigmaMetaData: false,
  usePercentageOpacity: false,
  splitByCollection: false,
  omitCollectionNames: false,
  servers: {
    jsonbin: {
      isEnabled: false,
      id: '',
      name: '',
      secretKey: '',
    },
    github: {
      isEnabled: false,
      token: '',
      repo: '',
      branch: '',
      fileName: '',
      owner: '',
      commitMessage: '',
    },
    githubPullRequest: {
      isEnabled: false,
      token: '',
      repo: '',
      branch: '',
      baseBranch: '',
      fileName: '',
      owner: '',
      commitMessage: '',
    },
    gitlab: {
      isEnabled: false,
      host: '',
      token: '',
      repo: '',
      branch: '',
      fileName: '',
      owner: '',
      commitMessage: '',
    },
    customURL: {
      isEnabled: false,
      url: '',
      method: 'POST',
      headers: '',
    },
  },
});

const sanitizeProfileConfig = (
  config: Partial<JSONSettingsConfigI>
): JSONSettingsConfigI => {
  const safeConfig = (config || {}) as Partial<JSONSettingsConfigI>;
  const defaults = createDefaultJSONSettingsConfig();

  return {
    ...defaults,
    ...safeConfig,
    includedStyles: {
      ...defaults.includedStyles,
      ...(safeConfig.includedStyles || {}),
    },
    variableCollections: safeConfig.variableCollections || [],
    splitByCollection: safeConfig.splitByCollection ?? false,
    omitCollectionNames: safeConfig.omitCollectionNames ?? false,
    servers: {
      ...defaults.servers,
      ...(safeConfig.servers || {}),
      jsonbin: {
        ...defaults.servers.jsonbin,
        ...(safeConfig.servers?.jsonbin || {}),
      },
      github: {
        ...defaults.servers.github,
        ...(safeConfig.servers?.github || {}),
      },
      githubPullRequest: {
        ...defaults.servers.githubPullRequest,
        ...(safeConfig.servers?.githubPullRequest || {}),
      },
      gitlab: {
        ...defaults.servers.gitlab,
        ...(safeConfig.servers?.gitlab || {}),
      },
      customURL: {
        ...defaults.servers.customURL,
        ...(safeConfig.servers?.customURL || {}),
      },
    },
  };
};

const createProfile = (
  profileName: string,
  config: Partial<JSONSettingsConfigI>
): SettingsProfileI => ({
  ...sanitizeProfileConfig(config),
  profileName,
  updatedAt: Date.now(),
});

export const createV2DefaultConfig = (): MultiTenantConfigV2I => {
  const defaultProfileId = 'default';

  return {
    version: 'v2',
    activeProfileId: defaultProfileId,
    profiles: {
      [defaultProfileId]: createProfile('Default', {}),
    },
  };
};

const normalizeV2Config = (
  config: Partial<MultiTenantConfigV2I>
): MultiTenantConfigV2I => {
  const fallback = createV2DefaultConfig();

  const sourceProfiles = config.profiles || {};
  const normalizedProfiles = Object.keys(sourceProfiles).reduce(
    (acc, profileId) => {
      const profile = sourceProfiles[profileId];

      if (!profile) {
        return acc;
      }

      acc[profileId] = {
        ...createProfile(profile.profileName || 'Profile', profile),
        profileName: profile.profileName || 'Profile',
        updatedAt: profile.updatedAt || Date.now(),
      };

      return acc;
    },
    {} as Record<ProfileId, SettingsProfileI>
  );

  if (!Object.keys(normalizedProfiles).length) {
    return fallback;
  }

  const hasActiveProfile =
    !!config.activeProfileId && !!normalizedProfiles[config.activeProfileId];

  return {
    version: 'v2',
    activeProfileId: hasActiveProfile
      ? (config.activeProfileId as string)
      : Object.keys(normalizedProfiles)[0],
    profiles: normalizedProfiles,
  };
};

export const parseStoredConfig = (
  rawValue: unknown
): {
  config: MultiTenantConfigV2I;
  didMigrate: boolean;
} => {
  if (!rawValue) {
    return {
      config: createV2DefaultConfig(),
      didMigrate: true,
    };
  }

  try {
    const parsed =
      typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;

    if (parsed?.version === 'v2') {
      return {
        config: normalizeV2Config(parsed),
        didMigrate: false,
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        config: createV2DefaultConfig(),
        didMigrate: true,
      };
    }

    const legacyConfig = sanitizeProfileConfig(parsed as LegacyStorageConfigI);

    return {
      config: {
        version: 'v2',
        activeProfileId: 'default',
        profiles: {
          default: createProfile('Default', legacyConfig),
        },
      },
      didMigrate: true,
    };
  } catch (error) {
    return {
      config: createV2DefaultConfig(),
      didMigrate: true,
    };
  }
};

export const updateActiveProfile = (
  config: MultiTenantConfigV2I,
  profile: Partial<JSONSettingsConfigI>
): MultiTenantConfigV2I => {
  const activeProfileId = config.activeProfileId;
  const currentProfile =
    config.profiles[activeProfileId] || createProfile('Default', {});

  return {
    ...config,
    profiles: {
      ...config.profiles,
      [activeProfileId]: {
        ...createProfile(currentProfile.profileName, {
          ...currentProfile,
          ...profile,
        }),
        profileName: currentProfile.profileName,
      },
    },
  };
};

export const createProfileFromConfig = (
  profileName: string,
  config: JSONSettingsConfigI
): SettingsProfileI => createProfile(profileName, config);

export const sanitizeMultiTenantConfig = (
  config: MultiTenantConfigV2I
): MultiTenantConfigV2I => normalizeV2Config(config);
