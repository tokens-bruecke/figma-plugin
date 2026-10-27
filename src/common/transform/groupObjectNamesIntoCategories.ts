import { isTokenObject } from './rootTokens';

/**
 * Turns `{ "a/b": token }` into `{ a: { b: token } }`. Only the keys of
 * `inputObject` are split, never keys further down, so mode names inside a
 * token can contain `/`. A variable can be
 * named like a group of other variables ("border/brand" next to
 * "border/brand/subtle"). With `rootKey` (`$root` for DTCG) such a token
 * goes into the group under that key; without it, the token and the group
 * are merged into one object as in the legacy format.
 */
export const groupObjectNamesIntoCategories = (
  inputObject: any,
  rootKey?: string
) => {
  const result = {};

  for (const key in inputObject) {
    const parts = key.split('/');
    let current = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (i === parts.length - 1) {
        const existing = current[part];
        const value = inputObject[key];

        if (
          existing &&
          typeof existing === 'object' &&
          !(rootKey && isTokenObject(existing)) &&
          !Array.isArray(existing) &&
          value &&
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {
          // A group with this name was already created (e.g. a variable named
          // "border/brand" alongside "border/brand/subtle"). Add the token to
          // the existing group instead of overwriting it, so sibling tokens
          // are not silently dropped.
          current[part] = rootKey
            ? { ...existing, [rootKey]: value }
            : { ...value, ...existing };
        } else {
          current[part] = value;
        }
      } else {
        if (!current[part]) {
          current[part] = {};
        } else if (rootKey && isTokenObject(current[part])) {
          // The token came first: turn it into the root of a new group
          current[part] = { [rootKey]: current[part] };
        }
        current = current[part];
      }
    }
  }

  return result;
};
