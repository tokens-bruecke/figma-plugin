import { describe, expect, it } from 'vitest';

import { createProfileFromConfig } from './storageConfig';
import {
  getChangedServerTargets,
  mergeSharedProfile,
  parseSharedProfiles,
  serializeSharedProfiles,
  shareProfile,
  stripCredentials,
  unshareProfile,
} from './sharedProfiles';

// The credential values below, not the field names like `secretKey`
const credentialValues = /ghp_|glpat_|jsonbin-secret|Bearer/;

const profileWithCredentials = (): SettingsProfileI => {
  const profile = createProfileFromConfig('Web', {} as JSONSettingsConfigI);

  return {
    ...profile,
    colorMode: 'rgba-css',
    sharedId: 'shared-1',
    sharedUpdatedAt: 1,
    servers: {
      jsonbin: {
        ...profile.servers.jsonbin,
        isEnabled: true,
        id: 'bin',
        secretKey: 'jsonbin-secret',
      },
      github: {
        ...profile.servers.github,
        isEnabled: true,
        token: 'ghp_secret',
        owner: 'acme',
        repo: 'tokens',
        branch: 'main',
        fileName: 'tokens.json',
      },
      githubPullRequest: {
        ...profile.servers.githubPullRequest,
        token: 'ghp_pr_secret',
        repo: 'tokens',
      },
      gitlab: {
        ...profile.servers.gitlab,
        token: 'glpat_secret',
        host: 'gitlab.acme.dev',
      },
      customURL: {
        ...profile.servers.customURL,
        isEnabled: true,
        url: 'https://tokens.acme.dev/upload',
        headers: '{"Authorization":"Bearer secret"}',
      },
    },
  };
};

describe('stripCredentials', () => {
  it('removes every token, key and custom header', () => {
    const stripped = stripCredentials(profileWithCredentials());

    expect(JSON.stringify(stripped)).not.toMatch(credentialValues);
    expect(stripped.servers.jsonbin.secretKey).toBe('');
    expect(stripped.servers.github.token).toBe('');
    expect(stripped.servers.githubPullRequest.token).toBe('');
    expect(stripped.servers.gitlab.token).toBe('');
    expect(stripped.servers.customURL.headers).toBe('');
  });

  it('keeps the settings and server targets', () => {
    const stripped = stripCredentials(profileWithCredentials());

    expect(stripped.colorMode).toBe('rgba-css');
    expect(stripped.servers.github).toMatchObject({
      isEnabled: true,
      owner: 'acme',
      repo: 'tokens',
      branch: 'main',
      fileName: 'tokens.json',
    });
    expect(stripped.servers.gitlab.host).toBe('gitlab.acme.dev');
    expect(stripped.servers.customURL.url).toBe(
      'https://tokens.acme.dev/upload'
    );
  });

  it('drops the local link to a shared profile', () => {
    const stripped = stripCredentials(profileWithCredentials());

    expect(stripped).not.toHaveProperty('sharedId');
    expect(stripped).not.toHaveProperty('sharedUpdatedAt');
  });

  it('does not change the original profile', () => {
    const profile = profileWithCredentials();
    stripCredentials(profile);

    expect(profile.servers.github.token).toBe('ghp_secret');
  });
});

describe('parseSharedProfiles', () => {
  it('returns no profiles for empty or broken data', () => {
    expect(parseSharedProfiles('')).toEqual({});
    expect(parseSharedProfiles('{not json')).toEqual({});
    expect(parseSharedProfiles('[]')).toEqual({});
  });

  it('fills missing settings with the defaults', () => {
    const shared = parseSharedProfiles(
      JSON.stringify({ 'shared-1': { profileName: 'Web', updatedAt: 5 } })
    );

    expect(shared['shared-1'].profileName).toBe('Web');
    expect(shared['shared-1'].updatedAt).toBe(5);
    expect(shared['shared-1'].useDTCG).toBe(true);
    expect(shared['shared-1'].servers.github.token).toBe('');
  });

  it('strips credentials that another plugin version stored', () => {
    const shared = parseSharedProfiles(
      JSON.stringify({ 'shared-1': profileWithCredentials() })
    );

    expect(JSON.stringify(shared)).not.toMatch(credentialValues);
  });
});

describe('shareProfile / unshareProfile', () => {
  it('stores a stripped copy under the shared id', () => {
    const shared = shareProfile({}, 'shared-1', profileWithCredentials(), 42);

    expect(shared['shared-1'].updatedAt).toBe(42);
    expect(JSON.stringify(shared)).not.toMatch(credentialValues);
  });

  it('removes a shared profile', () => {
    const shared = shareProfile({}, 'shared-1', profileWithCredentials(), 42);

    expect(unshareProfile(shared, 'shared-1')).toEqual({});
  });
});

describe('serializeSharedProfiles', () => {
  it('returns an empty string to remove the entry', () => {
    expect(serializeSharedProfiles({})).toBe('');
  });

  it('round-trips through parseSharedProfiles', () => {
    const shared = shareProfile({}, 'shared-1', profileWithCredentials(), 42);

    expect(parseSharedProfiles(serializeSharedProfiles(shared))).toEqual(
      shared
    );
  });

  it('refuses values over the pluginData limit', () => {
    const profile = profileWithCredentials();
    const shared = shareProfile(
      {},
      'shared-1',
      { ...profile, profileName: 'x'.repeat(100000) },
      42
    );

    expect(() => serializeSharedProfiles(shared)).toThrow(/too large/);
  });
});

describe('mergeSharedProfile', () => {
  it('takes the settings from the file and keeps local credentials', () => {
    const local = profileWithCredentials();
    const shared = stripCredentials({
      ...profileWithCredentials(),
      colorMode: 'rgba-object',
      profileName: 'Designer name',
      updatedAt: 99,
    });

    const merged = mergeSharedProfile(local, shared, 'shared-1');

    expect(merged.colorMode).toBe('rgba-object');
    expect(merged.profileName).toBe('Web');
    expect(merged.servers.github.token).toBe('ghp_secret');
    expect(merged.servers.customURL.headers).toBe(
      '{"Authorization":"Bearer secret"}'
    );
    expect(merged.sharedId).toBe('shared-1');
    expect(merged.sharedUpdatedAt).toBe(99);
  });

  it('drops a credential when the shared profile changes its host', () => {
    const local = profileWithCredentials();
    const base = profileWithCredentials();
    const shared = stripCredentials({
      ...base,
      servers: {
        ...base.servers,
        gitlab: { ...base.servers.gitlab, isEnabled: true, host: 'evil.dev' },
        customURL: {
          ...base.servers.customURL,
          url: 'https://evil.dev/collect',
        },
      },
    });

    expect(getChangedServerTargets(local, shared)).toEqual([
      'gitlab',
      'customURL',
    ]);

    const merged = mergeSharedProfile(local, shared, 'shared-1');

    expect(JSON.stringify(merged.servers.gitlab)).not.toMatch(credentialValues);
    expect(merged.servers.gitlab).toMatchObject({
      host: 'evil.dev',
      token: '',
      isEnabled: false,
    });
    expect(merged.servers.customURL).toMatchObject({
      headers: '',
      isEnabled: false,
    });
    // Servers with a fixed API host keep their credential
    expect(merged.servers.github.token).toBe('ghp_secret');
    expect(merged.servers.jsonbin.secretKey).toBe('jsonbin-secret');
  });

  it('keeps a credential when only the path or the host spelling changes', () => {
    const local = profileWithCredentials();
    const base = profileWithCredentials();
    const shared = stripCredentials({
      ...base,
      servers: {
        ...base.servers,
        gitlab: { ...base.servers.gitlab, host: 'https://GitLab.acme.dev/' },
        customURL: {
          ...base.servers.customURL,
          url: 'https://tokens.acme.dev/v2/upload',
        },
      },
    });

    const merged = mergeSharedProfile(local, shared, 'shared-1');

    expect(getChangedServerTargets(local, shared)).toEqual([]);
    expect(merged.servers.gitlab.token).toBe('glpat_secret');
    expect(merged.servers.customURL.headers).toBe(
      '{"Authorization":"Bearer secret"}'
    );
  });

  it('treats an empty GitLab host as gitlab.com', () => {
    const local = profileWithCredentials();
    const shared = stripCredentials(profileWithCredentials());
    local.servers.gitlab.host = '';
    shared.servers.gitlab.host = 'gitlab.com';

    expect(getChangedServerTargets(local, shared)).toEqual([]);
  });

  it('creates a profile without credentials when there is no local one', () => {
    const shared = stripCredentials({
      ...profileWithCredentials(),
      updatedAt: 7,
    });

    const merged = mergeSharedProfile(undefined, shared, 'shared-1');

    expect(merged.profileName).toBe('Web');
    expect(merged.servers.github.token).toBe('');
    expect(merged.sharedUpdatedAt).toBe(7);
  });
});
