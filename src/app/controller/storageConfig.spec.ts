import { describe, expect, it } from 'vitest';

import { parseStoredConfig, sanitizeMultiTenantConfig } from './storageConfig';

describe('parseStoredConfig', () => {
  it('drops the collection names that older versions stored in a profile', () => {
    const config = parseStoredConfig(
      JSON.stringify({
        activeProfileId: 'default',
        profiles: {
          default: {
            profileName: 'Default profile',
            updatedAt: 1,
            storeStyleInCollection: 'Primitives',
            variableCollections: ['Primitives', 'Semantics'],
          },
        },
      })
    );

    expect(config.profiles.default).not.toHaveProperty('variableCollections');
    expect(config.profiles.default.storeStyleInCollection).toBe('Primitives');
  });

  it('starts new profiles without collection names', () => {
    const config = sanitizeMultiTenantConfig({
      activeProfileId: 'default',
      profiles: {},
    });

    expect(config.profiles.default).not.toHaveProperty('variableCollections');
  });

  it('keeps the excluded collections and drops anything that is not a name', () => {
    const config = parseStoredConfig(
      JSON.stringify({
        activeProfileId: 'default',
        profiles: {
          default: {
            profileName: 'Default profile',
            updatedAt: 1,
            excludedCollections: ['Spacing', 3, null],
          },
          legacy: { profileName: 'Legacy', updatedAt: 1 },
        },
      })
    );

    expect(config.profiles.default.excludedCollections).toEqual(['Spacing']);
    expect(config.profiles.legacy.excludedCollections).toEqual([]);
  });
});
