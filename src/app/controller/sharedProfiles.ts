import { createProfileFromConfig } from './storageConfig';
import { normalizeGitlabHost } from '../api/servers/gitlabProject';

export const sharedProfilesKey = 'sharedProfiles';

// figma.root.setPluginData rejects entries over 100 kB (plugin id, key and
// value together), so stay clearly below that
const maxSharedProfilesLength = 90000;

// Everything that grants access to a server. pluginData is private to the
// plugin for stability, not security: anyone with the file can read it
const credentialFields: { [S in ServerType]?: (keyof ServerSettingsI[S])[] } = {
  jsonbin: ['secretKey'],
  github: ['token'],
  githubPullRequest: ['token'],
  gitlab: ['token'],
  // custom headers usually carry an Authorization header
  customURL: ['headers'],
};

const serverIds = Object.keys(credentialFields) as ServerType[];

export const stripCredentials = (
  profile: SettingsProfileI
): SettingsProfileI => {
  const servers = { ...profile.servers };

  serverIds.forEach((serverId) => {
    const server = { ...servers[serverId] };

    credentialFields[serverId].forEach((field) => {
      server[field as string] = '';
    });

    servers[serverId] = server as never;
  });

  // The link to a shared profile is local state of the person who shared it
  const {
    sharedId: _sharedId,
    sharedUpdatedAt: _sharedUpdatedAt,
    ...rest
  } = profile;

  return { ...rest, servers };
};

export const parseSharedProfiles = (rawValue: unknown): SharedProfilesI => {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed =
      typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.keys(parsed).reduce((acc, sharedId) => {
      const profile = parsed[sharedId];

      if (profile && typeof profile === 'object') {
        // Normalize with the defaults, and strip again in case another
        // version of the plugin wrote credentials
        acc[sharedId] = stripCredentials({
          ...createProfileFromConfig(
            profile.profileName || 'Shared profile',
            profile
          ),
          updatedAt: profile.updatedAt || 0,
        });
      }

      return acc;
    }, {} as SharedProfilesI);
  } catch {
    return {};
  }
};

export const serializeSharedProfiles = (profiles: SharedProfilesI): string => {
  if (!Object.keys(profiles).length) {
    // An empty string removes the pluginData entry
    return '';
  }

  const value = JSON.stringify(profiles);

  if (value.length > maxSharedProfilesLength) {
    throw new Error(
      `The shared profiles are too large to store in the file (${value.length} characters, max ${maxSharedProfilesLength}). Remove a shared profile and try again.`
    );
  }

  return value;
};

export const shareProfile = (
  sharedProfiles: SharedProfilesI,
  sharedId: string,
  profile: SettingsProfileI,
  updatedAt: number
): SharedProfilesI => ({
  ...sharedProfiles,
  [sharedId]: { ...stripCredentials(profile), updatedAt },
});

export const unshareProfile = (
  sharedProfiles: SharedProfilesI,
  sharedId: string
): SharedProfilesI => {
  const { [sharedId]: _, ...rest } = sharedProfiles;

  return rest;
};

const getOrigin = (url: string | undefined) => {
  try {
    return new URL(url).origin;
  } catch {
    return url ?? '';
  }
};

// Where a server sends its credential. GitHub and JSONBin always send it to
// their own API, so only servers with a configurable host are listed
const credentialTargets: {
  [S in ServerType]?: (server: ServerSettingsI[S]) => string;
} = {
  gitlab: (server) => normalizeGitlabHost(server?.host).toLowerCase(),
  customURL: (server) => getOrigin(server?.url),
};

/**
 * The servers whose credential would go to another host after applying the
 * shared profile. Anyone who can open the file can change a shared profile,
 * so a local credential must never follow a host that came from the file.
 */
export const getChangedServerTargets = (
  local: SettingsProfileI,
  shared: SettingsProfileI
): ServerType[] =>
  (Object.keys(credentialTargets) as ServerType[]).filter((serverId) => {
    const getTarget = credentialTargets[serverId] as (
      server: unknown
    ) => string;

    return (
      getTarget(local.servers[serverId]) !== getTarget(shared.servers[serverId])
    );
  });

/**
 * Applies a shared profile to a local one: settings come from the file,
 * the local name and credentials stay. A credential whose server now points
 * to another host is dropped and the server is turned off.
 */
export const mergeSharedProfile = (
  local: SettingsProfileI | undefined,
  shared: SettingsProfileI,
  sharedId: string
): SettingsProfileI => {
  const servers = { ...shared.servers };

  if (local) {
    const changedTargets = getChangedServerTargets(local, shared);

    serverIds.forEach((serverId) => {
      const server = { ...servers[serverId] };
      const isTargetChanged = changedTargets.includes(serverId);

      credentialFields[serverId].forEach((field) => {
        server[field as string] = isTargetChanged
          ? ''
          : local.servers[serverId][field as string];
      });

      if (isTargetChanged) {
        server.isEnabled = false;
      }

      servers[serverId] = server as never;
    });
  }

  return {
    ...shared,
    servers,
    profileName: local?.profileName ?? shared.profileName,
    updatedAt: Date.now(),
    sharedId,
    sharedUpdatedAt: shared.updatedAt,
  };
};
