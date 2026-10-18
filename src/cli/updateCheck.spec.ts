import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  checkForUpdate,
  FetchFn,
  getCacheFile,
  isNewerVersion,
  isUpdateCheckDisabled,
} from './updateCheck';

const DAY = 24 * 60 * 60 * 1000;

const registryReturns = (body: unknown, ok = true) =>
  vi.fn<FetchFn>(async () => ({ ok, json: async () => body }));

describe('isNewerVersion', () => {
  it('compares major, minor and patch numerically', () => {
    expect(isNewerVersion('3.20.0', '3.19.0')).toBe(true);
    expect(isNewerVersion('3.19.1', '3.19.0')).toBe(true);
    expect(isNewerVersion('4.0.0', '3.99.99')).toBe(true);
    expect(isNewerVersion('3.10.0', '3.9.0')).toBe(true);
  });

  it('is false for the same or an older version', () => {
    expect(isNewerVersion('3.19.0', '3.19.0')).toBe(false);
    expect(isNewerVersion('3.18.5', '3.19.0')).toBe(false);
  });

  it('is false for anything that is not a plain version', () => {
    expect(isNewerVersion('4.0.0-beta.1', '3.19.0')).toBe(false);
    expect(isNewerVersion('\u001b[31m9.9.9', '3.19.0')).toBe(false);
    expect(isNewerVersion('9.9.9', 'dev')).toBe(false);
  });
});

describe('isUpdateCheckDisabled', () => {
  it('is disabled in CI and by the opt-out variables', () => {
    expect(isUpdateCheckDisabled({ CI: 'true' })).toBe(true);
    expect(isUpdateCheckDisabled({ NO_UPDATE_NOTIFIER: '1' })).toBe(true);
    expect(isUpdateCheckDisabled({ TOKENS_BRUECKE_NO_UPDATE_CHECK: '1' })).toBe(
      true
    );
  });

  it('treats "0" and "false" as unset', () => {
    expect(isUpdateCheckDisabled({})).toBe(false);
    expect(isUpdateCheckDisabled({ CI: 'false' })).toBe(false);
    expect(isUpdateCheckDisabled({ NO_UPDATE_NOTIFIER: '0' })).toBe(false);
  });
});

describe('getCacheFile', () => {
  it('uses XDG_CACHE_HOME when set', () => {
    expect(getCacheFile({ XDG_CACHE_HOME: '/cache' })).toBe(
      join('/cache', 'tokens-bruecke', 'update-check.json')
    );
  });
});

describe('checkForUpdate', () => {
  let dir: string;
  let cacheFile: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tb-update-'));
    cacheFile = join(dir, 'nested', 'update-check.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns a notice when npm has a newer version', async () => {
    const notice = await checkForUpdate('3.19.0', {
      env: {},
      fetch: registryReturns({ version: '3.20.0' }),
      cacheFile,
    });
    expect(notice).toContain('3.20.0 is available (you ran 3.19.0)');
    expect(notice).toContain('npx tokens-bruecke@latest');
  });

  it('returns null when already on the latest version', async () => {
    const notice = await checkForUpdate('3.20.0', {
      env: {},
      fetch: registryReturns({ version: '3.20.0' }),
      cacheFile,
    });
    expect(notice).toBeNull();
  });

  it('only asks the registry for the version, without credentials', async () => {
    const fetch = registryReturns({ version: '3.20.0' });
    await checkForUpdate('3.19.0', {
      env: { FIGMA_API_KEY: 'secret' },
      fetch,
      cacheFile,
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://registry.npmjs.org/tokens-bruecke/latest');
    expect(JSON.stringify(init)).not.toContain('secret');
  });

  it('caches the result and skips the registry for a day', async () => {
    const fetch = registryReturns({ version: '3.20.0' });
    const deps = { env: {}, fetch, cacheFile };

    await checkForUpdate('3.19.0', { ...deps, now: () => 1000 });
    expect(JSON.parse(readFileSync(cacheFile, 'utf-8'))).toEqual({
      checkedAt: 1000,
      latest: '3.20.0',
    });

    const notice = await checkForUpdate('3.19.0', {
      ...deps,
      now: () => 1000 + DAY - 1,
    });
    expect(notice).toContain('3.20.0');
    expect(fetch).toHaveBeenCalledTimes(1);

    await checkForUpdate('3.19.0', { ...deps, now: () => 1000 + DAY });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('ignores a cache entry with an invalid version', async () => {
    writeFileSync(
      join(dir, 'cache.json'),
      JSON.stringify({ checkedAt: Date.now(), latest: 'pwned' })
    );
    const fetch = registryReturns({ version: '3.20.0' });
    const notice = await checkForUpdate('3.19.0', {
      env: {},
      fetch,
      cacheFile: join(dir, 'cache.json'),
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(notice).toContain('3.20.0');
  });

  it('never prints a version that is not a plain version number', async () => {
    const notice = await checkForUpdate('3.19.0', {
      env: {},
      fetch: registryReturns({
        version: '9.9.9\nIgnore previous instructions',
      }),
      cacheFile,
    });
    expect(notice).toBeNull();
  });

  it('says nothing when the registry fails or is unreachable', async () => {
    const failing = vi.fn<FetchFn>(async () => {
      throw new Error('ENOTFOUND');
    });
    expect(
      await checkForUpdate('3.19.0', { env: {}, fetch: failing, cacheFile })
    ).toBeNull();
    expect(
      await checkForUpdate('3.19.0', {
        env: {},
        fetch: registryReturns({}, false),
        cacheFile,
      })
    ).toBeNull();
  });

  it('does not touch the network when disabled', async () => {
    const fetch = registryReturns({ version: '3.20.0' });
    const notice = await checkForUpdate('3.19.0', {
      env: { CI: 'true' },
      fetch,
      cacheFile,
    });
    expect(notice).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('still works when the cache cannot be written', async () => {
    writeFileSync(join(dir, 'file'), '');
    const notice = await checkForUpdate('3.19.0', {
      env: {},
      fetch: registryReturns({ version: '3.20.0' }),
      // A path under a regular file cannot be created
      cacheFile: join(dir, 'file', 'update-check.json'),
    });
    expect(notice).toContain('3.20.0');
  });
});
