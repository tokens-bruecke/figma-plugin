import { toTokenName } from './tokenName';

export interface TokenFileI {
  path: string;
  content: string;
}

export interface SplitOptionsI {
  splitByCollection?: boolean;
  splitByMode?: boolean;
  // `target` is always a folder, so a name like `v1.2` is not mistaken for a file
  targetIsFolder?: boolean;
}

const SINGLE_FILE_NAME = 'design.tokens.json';

// Figma collection and mode names can contain characters that are illegal in
// file paths, so they are replaced before being used as a file or folder name.
const safeName = (name: string) => name.replace(/[/\\?%*:|"<>]/g, '-');

// The leading slash of the first part is kept so absolute paths survive
const joinPath = (...parts: string[]) =>
  parts
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part.replace(/\/+$/g, '') : part.replace(/^\/+|\/+$/g, '')
    )
    .filter(Boolean)
    .join('/');

// When splitting, the target is a folder. Users coming from single file exports
// may still have a `*.json` file path saved, so that file name is stripped off.
// Any other name is kept as is, so a folder like `tokens.v2` survives.
const toFolder = (target: string) => {
  const trimmed = (target || '').replace(/\/+$/g, '');

  if (!trimmed) return '';

  const lastSegment = trimmed.slice(trimmed.lastIndexOf('/') + 1);

  return /\.json$/i.test(lastSegment)
    ? trimmed.slice(0, trimmed.length - lastSegment.length).replace(/\/+$/, '')
    : trimmed;
};

/**
 * Splits a "CollectionName/ModeName" key. Both names can contain a slash, so
 * the longest collection name from the meta that prefixes the key wins; the
 * first slash is only the fallback.
 */
const splitModeKey = (
  key: string,
  modeTokens: any
): [string, string | undefined] => {
  const metaNames: unknown =
    modeTokens?.$extensions?.['tokens-bruecke-meta']?.variableCollections;
  // The meta keeps the Figma names; the keys use the token names
  const collectionNames = (Array.isArray(metaNames) ? metaNames : [])
    .filter((name) => typeof name === 'string')
    .map(toTokenName);

  // A collection with a single mode is not split, so its key has no mode
  if (collectionNames.includes(key)) {
    return [key, undefined];
  }

  const collectionName = collectionNames
    .filter(
      (name) =>
        typeof name === 'string' &&
        key.startsWith(`${name}/`) &&
        key.length > name.length + 1
    )
    .sort((a, b) => b.length - a.length)[0];

  if (collectionName) {
    return [collectionName, key.slice(collectionName.length + 1)];
  }

  const slashIndex = key.indexOf('/');

  return slashIndex === -1
    ? [key, undefined]
    : [key.slice(0, slashIndex), key.slice(slashIndex + 1)];
};

/**
 * Turns the generated tokens object into the list of files that should be
 * written, downloaded or committed.
 *
 * - `target` is the file path when nothing is split
 * - `target` is the folder path when `splitByCollection` or `splitByMode` is on
 */
export const splitTokensIntoFiles = (
  tokens: Record<string, any>,
  {
    splitByCollection = false,
    splitByMode = false,
    targetIsFolder = false,
  }: SplitOptionsI = {},
  target = ''
): TokenFileI[] => {
  const stringify = (value: Record<string, any>) =>
    JSON.stringify(value, null, 2);

  if (!splitByCollection && !splitByMode) {
    return [
      {
        path: target || SINGLE_FILE_NAME,
        content: stringify(tokens),
      },
    ];
  }

  // Repository paths (the servers) are always relative, only the CLI writes
  // to an absolute folder
  const folder = targetIsFolder
    ? target.replace(/\/+$/g, '')
    : toFolder(target).replace(/^\/+/, '');

  if (splitByMode) {
    // Keys are "CollectionName/ModeName" — write as {CollectionName}/{ModeName}.tokens.json
    return Object.keys(tokens).map((key) => {
      const [collectionName, modeName] = splitModeKey(key, tokens[key]);

      if (modeName === undefined) {
        return {
          path: joinPath(folder, `${safeName(key)}.tokens.json`),
          content: stringify({ [key]: tokens[key] }),
        };
      }

      return {
        path: joinPath(
          folder,
          safeName(collectionName),
          `${safeName(modeName)}.tokens.json`
        ),
        content: stringify({ [collectionName]: tokens[key] }),
      };
    });
  }

  return Object.keys(tokens).map((collectionName) => ({
    path: joinPath(folder, `${safeName(collectionName)}.tokens.json`),
    content: stringify({ [collectionName]: tokens[collectionName] }),
  }));
};
