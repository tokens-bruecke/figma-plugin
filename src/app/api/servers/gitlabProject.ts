export const DEFAULT_GITLAB_HOST = 'gitlab.com';

// The plugin adds the scheme itself, so a host copied from the browser
// ("https://gitlab.acme.com/") would become "https://https://…"
export const normalizeGitlabHost = (host: string | undefined): string =>
  (host || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '') || DEFAULT_GITLAB_HOST;

const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * The URL-encoded `namespace/project` path that the GitLab API takes as
 * project id. The owner can be a group with subgroups ("acme/design"), whose
 * slashes have to be encoded too. An owner already entered encoded
 * ("acme%2Fdesign", the old workaround) is decoded first.
 */
export const getGitlabProjectId = (owner: string, repo: string): string => {
  const path = [owner, repo]
    .map((part) => decode((part || '').trim()).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');

  return encodeURIComponent(path);
};
