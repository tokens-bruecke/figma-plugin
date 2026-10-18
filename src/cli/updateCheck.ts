import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';

// Only the version number is requested: no token, file key or config leaves the machine
const REGISTRY_URL = 'https://registry.npmjs.org/tokens-bruecke/latest';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 1500;

// Strict on purpose: anything else from the registry is never printed, so a
// tampered response cannot put escape codes or text into a terminal or an
// agent's context.
const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

type Env = Record<string, string | undefined>;

// Node's fetch, narrowed to what is used here: the Figma plugin typings
// declare a different global fetch, so the DOM type is not available.
export type FetchFn = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal }
) => Promise<{ ok: boolean; json(): Promise<any> }>;

interface CacheEntry {
  checkedAt: number;
  latest: string;
}

export interface UpdateCheckDeps {
  env?: Env;
  now?: () => number;
  fetch?: FetchFn;
  cacheFile?: string;
}

const isSet = (value: string | undefined): boolean =>
  !!value && value !== '0' && value !== 'false';

export function isUpdateCheckDisabled(env: Env): boolean {
  return (
    isSet(env.CI) ||
    isSet(env.NO_UPDATE_NOTIFIER) ||
    isSet(env.TOKENS_BRUECKE_NO_UPDATE_CHECK)
  );
}

export function isNewerVersion(latest: string, current: string): boolean {
  const a = VERSION_PATTERN.exec(latest);
  const b = VERSION_PATTERN.exec(current);
  if (!a || !b) return false;
  for (let i = 1; i <= 3; i++) {
    const diff = Number(a[i]) - Number(b[i]);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

export function getCacheFile(env: Env): string {
  const cacheRoot = env.XDG_CACHE_HOME || join(homedir(), '.cache');
  return join(cacheRoot, 'tokens-bruecke', 'update-check.json');
}

function readCache(cacheFile: string): CacheEntry | null {
  try {
    const entry = JSON.parse(readFileSync(cacheFile, 'utf-8'));
    if (
      typeof entry?.checkedAt === 'number' &&
      typeof entry?.latest === 'string' &&
      VERSION_PATTERN.test(entry.latest)
    ) {
      return entry;
    }
  } catch {
    // Missing or unreadable cache: check the registry instead
  }
  return null;
}

function writeCache(cacheFile: string, entry: CacheEntry): void {
  try {
    mkdirSync(dirname(cacheFile), { recursive: true });
    writeFileSync(cacheFile, JSON.stringify(entry), 'utf-8');
  } catch {
    // A read-only home directory only means checking again next run
  }
}

async function fetchLatestVersion(fetchImpl: FetchFn): Promise<string | null> {
  try {
    const response = await fetchImpl(REGISTRY_URL, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const version = body?.version;
    return typeof version === 'string' && VERSION_PATTERN.test(version)
      ? version
      : null;
  } catch {
    // Offline, blocked or slow: say nothing
    return null;
  }
}

/**
 * Returns a one-line notice when a newer version is on npm, otherwise null.
 * Never throws and never installs anything; the registry is asked at most
 * once a day.
 */
export async function checkForUpdate(
  currentVersion: string,
  deps: UpdateCheckDeps = {}
): Promise<string | null> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetch ?? (globalThis as any).fetch;
  if (isUpdateCheckDisabled(env) || typeof fetchImpl !== 'function') {
    return null;
  }

  const now = (deps.now ?? Date.now)();
  const cacheFile = deps.cacheFile ?? getCacheFile(env);
  const cached = readCache(cacheFile);

  let latest: string | null;
  if (cached && now - cached.checkedAt < CHECK_INTERVAL_MS) {
    latest = cached.latest;
  } else {
    latest = await fetchLatestVersion(fetchImpl);
    if (latest) writeCache(cacheFile, { checkedAt: now, latest });
  }

  if (!latest || !isNewerVersion(latest, currentVersion)) return null;
  return `ℹ️  tokens-bruecke ${latest} is available (you ran ${currentVersion}). Use the latest version with: npx tokens-bruecke@latest`;
}
