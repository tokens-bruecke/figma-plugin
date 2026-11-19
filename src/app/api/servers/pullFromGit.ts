import {
  SINGLE_FILE_NAME,
  SplitOptionsI,
  safeName,
  toFolder,
} from '../../../common/transform/splitTokensIntoFiles';
import { toTokenName } from '../../../common/transform/tokenName';
import {
  createGitlabApi,
  getGitlabErrorMessage,
  readGitlabResponse,
} from './gitlabCommit';
import { getGitlabProjectId } from './gitlabProject';

// Read-only requests that fetch the token files a push wrote, so they can be
// imported into the Figma variables.

export type GitServerType =
  | 'github'
  | 'githubPullRequest'
  | 'gitlab'
  | 'gitlabMergeRequest';

export const GIT_SERVERS: GitServerType[] = [
  'github',
  'githubPullRequest',
  'gitlab',
  'gitlabMergeRequest',
];

export const isGitServer = (server: string): server is GitServerType =>
  (GIT_SERVERS as string[]).includes(server);

export interface PulledFileI {
  path: string;
  tokens: any;
}

export interface PullResultI {
  files: PulledFileI[];
  /** Where the files came from, e.g. `acme/tokens · main` */
  source: string;
}

export type GitCredentialsT =
  | GithubCredentialsI
  | GithubPullRequestCredentialsI
  | GitlabCredentialsI
  | GitlabMergeRequestCredentialsI;

const isGithub = (server: GitServerType) =>
  server === 'github' || server === 'githubPullRequest';

/**
 * A pull reads the branch a push writes to. The PR and MR servers read the
 * branch they merge into: their own branch is reset on every push, and the
 * target branch holds what was reviewed.
 */
export const getPullBranch = (
  server: GitServerType,
  credentials: GitCredentialsT
): string =>
  server === 'githubPullRequest' || server === 'gitlabMergeRequest'
    ? (
        credentials as
          | GithubPullRequestCredentialsI
          | GitlabMergeRequestCredentialsI
      ).baseBranch
    : (credentials as GithubCredentialsI | GitlabCredentialsI).branch;

export const getRepositoryName = (
  server: GitServerType,
  credentials: GitCredentialsT
): string =>
  isGithub(server)
    ? `${credentials.owner}/${credentials.repo}`
    : decodeURIComponent(
        getGitlabProjectId(credentials.owner, credentials.repo)
      );

export const getPullSource = (
  server: GitServerType,
  credentials: GitCredentialsT
): string =>
  `${getRepositoryName(server, credentials)} · ${getPullBranch(
    server,
    credentials
  )}`;

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

const TOKENS_FILE = /\.tokens\.json$/i;

/** The folder a split push writes into, relative to the repository root */
export const getPullFolder = (fileName: string) =>
  trimSlashes(toFolder(fileName || ''));

/**
 * The paths of a repository listing that a push with these options writes,
 * so a pull reads exactly those files:
 *
 * - nothing split: the file at `fileName`
 * - split by collection: `<folder>/<Collection>.tokens.json`
 * - split by mode: also `<folder>/<Collection>/<Mode>.tokens.json`
 *
 * Files of excluded collections are left out, like on push.
 */
export const selectTokenFiles = (
  paths: string[],
  {
    splitByCollection = false,
    splitByMode = false,
    excludedCollections = [],
  }: SplitOptionsI,
  fileName: string
): string[] => {
  const normalized = paths.map(trimSlashes);

  if (!splitByCollection && !splitByMode) {
    const target = trimSlashes(fileName || '') || SINGLE_FILE_NAME;
    return normalized.filter((path) => path === target);
  }

  const folder = getPullFolder(fileName);
  const prefix = folder ? `${folder}/` : '';
  // A push names the files after the token names of the collections
  const excluded = new Set(
    excludedCollections.map((name) => safeName(toTokenName(name)))
  );

  return normalized
    .filter((path) => path.startsWith(prefix))
    .filter((path) => {
      const segments = path.slice(prefix.length).split('/');
      const file = segments[segments.length - 1];

      if (!TOKENS_FILE.test(file)) return false;
      if (segments.length > (splitByMode ? 2 : 1)) return false;

      const collection =
        segments.length === 2 ? segments[0] : file.replace(TOKENS_FILE, '');

      return !excluded.has(collection);
    })
    .sort();
};

/** The collections in the pulled files, once each, for the confirmation */
export const getPulledCollections = (files: PulledFileI[]): string[] =>
  Array.from(
    new Set(
      files.flatMap((file) =>
        file.tokens && typeof file.tokens === 'object'
          ? Object.keys(file.tokens).filter((key) => !key.startsWith('$'))
          : []
      )
    )
  );

/** Parses the fetched files, naming the first one that isn't JSON */
export const parseTokenFiles = (
  contents: { path: string; content: string }[]
): PulledFileI[] =>
  contents.map(({ path, content }) => {
    try {
      return { path, tokens: JSON.parse(content) };
    } catch (error) {
      throw new Error(`${path} is not valid JSON: ${error.message}`);
    }
  });

const noFilesError = (
  source: string,
  fileName: string,
  splitOptions: SplitOptionsI
) => {
  if (!splitOptions.splitByCollection && !splitOptions.splitByMode) {
    const target = trimSlashes(fileName || '') || SINGLE_FILE_NAME;
    return new Error(`There is no "${target}" in ${source}.`);
  }

  const folder = getPullFolder(fileName);
  return new Error(
    `There are no .tokens.json files ${
      folder ? `in "${folder}" ` : ''
    }in ${source}. Push the tokens once, or check the folder and the split settings.`
  );
};

/** Base64 to text, keeping non-ASCII characters intact */
export const decodeBase64Utf8 = (base64: string) => {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

//////////////
//  GitHub  //
//////////////

const githubRequest = async (path: string, token: string) => {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => ({}));

  return { response, data };
};

export const pullFromGithub = async (
  credentials: GithubCredentialsI | GithubPullRequestCredentialsI,
  branch: string,
  splitOptions: SplitOptionsI = {}
): Promise<PulledFileI[]> => {
  const { token, owner, repo, fileName } = credentials;
  const name = `${owner}/${repo}`;
  const source = `${name} · ${branch}`;

  const branchResult = await githubRequest(
    `/repos/${name}/branches/${encodeURIComponent(branch)}`,
    token
  );

  if (branchResult.response.status === 401) {
    throw new Error(
      'GitHub rejected the token. Check that it is complete and not expired.'
    );
  }

  if (!branchResult.response.ok) {
    throw new Error(
      `Could not find "${branch}" in ${name}. Check the repository name, the branch and the token scope.`
    );
  }

  const treeSha = branchResult.data?.commit?.commit?.tree?.sha;
  const treeResult = await githubRequest(
    `/repos/${name}/git/trees/${treeSha}?recursive=1`,
    token
  );

  if (!treeResult.response.ok) {
    throw new Error(
      treeResult.data?.message || `Could not list the files of ${source}.`
    );
  }

  if (treeResult.data.truncated) {
    throw new Error(
      `${name} has too many files for GitHub to list in one request.`
    );
  }

  const blobs: { path: string; sha: string }[] = (
    treeResult.data.tree || []
  ).filter((entry: any) => entry.type === 'blob');
  const paths = selectTokenFiles(
    blobs.map((blob) => blob.path),
    splitOptions,
    fileName
  );

  if (paths.length === 0) {
    throw noFilesError(source, fileName, splitOptions);
  }

  const contents = await Promise.all(
    paths.map(async (path) => {
      const blob = blobs.find((entry) => trimSlashes(entry.path) === path);
      const { response, data } = await githubRequest(
        `/repos/${name}/git/blobs/${blob.sha}`,
        token
      );

      if (!response.ok) {
        throw new Error(data?.message || `Could not read ${path}.`);
      }

      return {
        path,
        content:
          data.encoding === 'base64'
            ? decodeBase64Utf8(data.content)
            : data.content,
      };
    })
  );

  return parseTokenFiles(contents);
};

//////////////
//  GitLab  //
//////////////

export const pullFromGitlab = async (
  credentials: GitlabCredentialsI | GitlabMergeRequestCredentialsI,
  branch: string,
  splitOptions: SplitOptionsI = {}
): Promise<PulledFileI[]> => {
  const api = createGitlabApi(credentials);
  const { fileName } = credentials;
  const source = `${getRepositoryName('gitlab', credentials)} · ${branch}`;
  const isSplit = splitOptions.splitByCollection || splitOptions.splitByMode;
  const target = trimSlashes(fileName || '') || SINGLE_FILE_NAME;
  // The folder that holds the files: the split folder, or the folder of
  // the single file
  const folder = isSplit
    ? getPullFolder(fileName)
    : target.includes('/')
    ? target.slice(0, target.lastIndexOf('/'))
    : '';

  const paths: string[] = [];
  let page = '1';

  while (page) {
    const query = new URLSearchParams({
      ref: branch,
      recursive: 'true',
      per_page: '100',
      page,
      ...(folder && { path: folder }),
    });
    const response = await fetch(`${api.baseUrl}/repository/tree?${query}`, {
      headers: api.headers,
    });
    const data = await readGitlabResponse(response);

    if (response.status === 401) {
      throw new Error(
        'GitLab rejected the token. Check that it is complete and not expired.'
      );
    }

    if (response.status === 404) {
      // GitLab answers 404 for a missing branch and for a missing folder
      throw folder
        ? noFilesError(source, fileName, splitOptions)
        : new Error(
            `Could not find "${branch}" in ${getRepositoryName(
              'gitlab',
              credentials
            )}. Check the project, the branch and the token scope.`
          );
    }

    if (!response.ok) {
      throw new Error(getGitlabErrorMessage(data, response));
    }

    (Array.isArray(data) ? data : [])
      .filter((entry: any) => entry.type === 'blob')
      .forEach((entry: any) => paths.push(entry.path));

    page = response.headers.get('x-next-page') || '';
  }

  const selected = selectTokenFiles(paths, splitOptions, fileName);

  if (selected.length === 0) {
    throw noFilesError(source, fileName, splitOptions);
  }

  const contents = await Promise.all(
    selected.map(async (path) => {
      const response = await fetch(
        `${api.baseUrl}/repository/files/${encodeURIComponent(
          path
        )}/raw?ref=${encodeURIComponent(branch)}`,
        { headers: api.headers }
      );

      if (!response.ok) {
        const data = await readGitlabResponse(response);
        throw new Error(
          `Could not read ${path}: ${getGitlabErrorMessage(data, response)}`
        );
      }

      return { path, content: await response.text() };
    })
  );

  return parseTokenFiles(contents);
};

/** Fetches the token files of a Git server, for an import */
export const pullTokens = async (
  server: GitServerType,
  servers: ServerSettingsI,
  splitOptions: SplitOptionsI = {}
): Promise<PullResultI> => {
  const credentials = servers[server];
  const branch = getPullBranch(server, credentials);
  const files = isGithub(server)
    ? await pullFromGithub(
        credentials as GithubCredentialsI | GithubPullRequestCredentialsI,
        branch,
        splitOptions
      )
    : await pullFromGitlab(
        credentials as GitlabCredentialsI | GitlabMergeRequestCredentialsI,
        branch,
        splitOptions
      );

  return { files, source: getPullSource(server, credentials) };
};
