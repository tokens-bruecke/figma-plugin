/**
 * DTCG 2025.10 (format §6.2) gives a group its own token under the reserved
 * name `$root`. Figma allows a variable named like a group of other
 * variables ("border/brand" next to "border/brand/subtle"), and a token that
 * also holds child tokens is invalid DTCG (§6.1).
 */
export const ROOT_TOKEN_KEY = '$root';

export const isTokenObject = (value: any): boolean =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  ('$value' in value || (typeof value.type === 'string' && 'value' in value));

const isGroupObject = (value: any): boolean =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !isTokenObject(value);

const valueKeys = ['$value', 'value'];

/**
 * A reference to a group with a root token has to name the root token:
 * `{border.brand}` refers to the group, `{border.brand.$root}` to the token.
 * Returns the reference unchanged when it doesn't point at such a group.
 */
const addRootToReference = (body: string, tokens: Record<string, any>) => {
  const segments = body.split('.');
  const lastSegment = segments[segments.length - 1];
  const pathLength = valueKeys.includes(lastSegment)
    ? segments.length - 1
    : segments.length;

  let node: any = tokens;
  for (let i = 0; i < pathLength; i++) {
    if (!isGroupObject(node) || !(segments[i] in node)) {
      return body;
    }
    node = node[segments[i]];
  }

  if (!isGroupObject(node) || !isTokenObject(node[ROOT_TOKEN_KEY])) {
    return body;
  }

  return [
    ...segments.slice(0, pathLength),
    ROOT_TOKEN_KEY,
    ...segments.slice(pathLength),
  ].join('.');
};

const mapReferences = (value: any, tokens: Record<string, any>): any => {
  if (typeof value === 'string') {
    return value.replace(
      /\{([^{}]+)\}/g,
      (_, body) => `{${addRootToReference(body, tokens)}}`
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => mapReferences(item, tokens));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        mapReferences(item, tokens),
      ])
    );
  }
  return value;
};

/**
 * Points every reference to a variable that became a `$root` token at
 * `….$root`, in the values of all modes. Changes the tokens in place.
 */
export const addRootToReferences = (
  tokens: Record<string, any>,
  node: Record<string, any> = tokens
) => {
  for (const value of Object.values(node)) {
    if (isTokenObject(value)) {
      value.$value = mapReferences(value.$value, tokens);
      if (value.$extensions?.mode) {
        value.$extensions.mode = mapReferences(value.$extensions.mode, tokens);
      }
    } else if (isGroupObject(value)) {
      addRootToReferences(tokens, value);
    }
  }
};
