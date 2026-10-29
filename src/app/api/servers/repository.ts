import { DEFAULT_GITLAB_HOST, normalizeGitlabHost } from './gitlabProject';

export interface RepositoryI {
  host: string;
  owner: string;
  repo: string;
  /** Only set when the pasted URL pointed at a branch */
  branch?: string;
}

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

/**
 * Accepts what people copy: "owner/repo", the repository URL, a URL that
 * points at a branch (".../tree/main") and the SSH clone URL.
 */
export const parseGithubRepository = (input: string): RepositoryI | null => {
  let value = (input || '').trim();
  if (!value) return null;

  value = value
    .replace(/^git@github\.com:/i, '')
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '')
    .replace(/[?#].*$/, '');

  const parts = trimSlashes(value).split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const [owner, rawRepo, marker, ...branchParts] = parts;
  const repo = rawRepo.replace(/\.git$/i, '');
  const branch =
    marker === 'tree' && branchParts.length
      ? decodeURIComponent(branchParts.join('/'))
      : undefined;

  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;

  return { host: 'github.com', owner, repo, branch };
};

const parseGitlabPath = (host: string, value: string): RepositoryI | null => {
  const [pathPart, routePart = ''] = value.replace(/[?#].*$/, '').split('/-/');
  const parts = trimSlashes(pathPart)
    .replace(/\.git$/i, '')
    .split('/');

  if (parts.length < 2 || parts.some((part) => !/^[\w.-]+$/.test(part))) {
    return null;
  }

  const route = trimSlashes(routePart).split('/');
  const branch =
    route[0] === 'tree' && route.length > 1
      ? decodeURIComponent(route.slice(1).join('/'))
      : undefined;

  return {
    host: normalizeGitlabHost(host),
    owner: parts.slice(0, -1).join('/'),
    repo: parts[parts.length - 1],
    branch,
  };
};

/**
 * Accepts "group/project", "group/subgroup/project", the project URL of
 * gitlab.com or a self-managed instance, URLs into the project
 * (".../-/tree/main") and the SSH clone URL. A first segment with a dot is
 * read as the host, so "gitlab.acme.com/design/tokens" works without scheme.
 */
export const parseGitlabProject = (input: string): RepositoryI | null => {
  const value = (input || '').trim();
  if (!value) return null;

  const ssh = value.match(/^git@([^:]+):(.+)$/);
  if (ssh) return parseGitlabPath(ssh[1], ssh[2]);

  const hasScheme = /^https?:\/\//i.test(value);
  const withoutScheme = value.replace(/^https?:\/\//i, '');
  const firstSegment = withoutScheme.split('/')[0];
  const looksLikeHost =
    hasScheme || firstSegment.includes('.') || firstSegment.includes(':');

  // Group names may contain dots too: "my.group/tokens" is a gitlab.com path
  return (
    (looksLikeHost &&
      parseGitlabPath(
        firstSegment,
        withoutScheme.slice(firstSegment.length)
      )) ||
    (hasScheme ? null : parseGitlabPath('', withoutScheme))
  );
};

export const formatGithubRepository = (owner: string, repo: string) =>
  owner && repo ? `${owner}/${repo}` : '';

/** Shown as the full URL, which is what people recognise and paste */
export const formatGitlabProject = (
  host: string,
  owner: string,
  repo: string
) => {
  if (!owner || !repo) return '';

  // owner may still be stored encoded by the old workaround
  let decodedOwner = owner;
  try {
    decodedOwner = decodeURIComponent(owner);
  } catch {
    // keep as is
  }

  return `https://${normalizeGitlabHost(host)}/${decodedOwner}/${repo}`;
};

export const isDefaultGitlabHost = (host: string) =>
  normalizeGitlabHost(host) === DEFAULT_GITLAB_HOST;
