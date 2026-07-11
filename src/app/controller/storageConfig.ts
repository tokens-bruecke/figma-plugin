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
  useDTCG: true,
  includeValueStringKeyToAlias: false,
  includeFigmaMetaData: false,
  usePercentageOpacity: false,
  splitByCollection: false,
  splitByMode: false,
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
    // Migrate legacy `useDTCGKeys` profiles to the new `useDTCG` flag
    useDTCG:
      safeConfig.useDTCG ??
      (safeConfig as { useDTCGKeys?: boolean }).useDTCGKeys ??
      defaults.useDTCG,
    variableCollections: safeConfig.variableCollections || [],
    splitByCollection: safeConfig.splitByCollection ?? false,
    splitByMode: safeConfig.splitByMode ?? false,
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

export const createDefaultConfig = (): MultiTenantConfigI => {
  const defaultProfileId = 'default';

  return {
    activeProfileId: defaultProfileId,
    profiles: {
      [defaultProfileId]: createProfile('Default profile', {}),
    },
  };
};

const normalizeConfig = (
  config: Partial<MultiTenantConfigI>
): MultiTenantConfigI => {
  const fallback = createDefaultConfig();

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
    activeProfileId: hasActiveProfile
      ? (config.activeProfileId as string)
      : Object.keys(normalizedProfiles)[0],
    profiles: normalizedProfiles,
  };
};

export const parseStoredConfig = (rawValue: unknown): MultiTenantConfigI => {
  if (!rawValue) {
    return createDefaultConfig();
  }

  try {
    const parsed =
      typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;

    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.activeProfileId === 'string' &&
      parsed.profiles
    ) {
      return normalizeConfig(parsed as Partial<MultiTenantConfigI>);
    }

    return createDefaultConfig();
  } catch {
    return createDefaultConfig();
  }
};

export const updateActiveProfile = (
  config: MultiTenantConfigI,
  profile: Partial<JSONSettingsConfigI>
): MultiTenantConfigI => {
  const activeProfileId = config.activeProfileId;
  const currentProfile =
    config.profiles[activeProfileId] || createProfile('Default profile', {});

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
  config: MultiTenantConfigI
): MultiTenantConfigI => normalizeConfig(config);
