import { TokenFileI } from '../../../common/transform/splitTokensIntoFiles';
import { getGitlabProjectId, normalizeGitlabHost } from './gitlabProject';

export interface GitlabApiI {
  baseUrl: string;
  headers: Record<string, string>;
}

export const createGitlabApi = (credentials: {
  host: string;
  owner: string;
  repo: string;
  token: string;
}): GitlabApiI => {
  const host = normalizeGitlabHost(credentials.host);
  const projectId = getGitlabProjectId(credentials.owner, credentials.repo);

  return {
    baseUrl: `https://${host}/api/v4/projects/${projectId}`,
    headers: {
      'Content-Type': 'application/json',
      'PRIVATE-TOKEN': credentials.token,
    },
  };
};

export const readGitlabResponse = async (response: Response) => {
  const body = await response.text();

  try {
    return JSON.parse(body);
  } catch {
    return { message: body || `Request failed: ${response.status}` };
  }
};

export const getGitlabErrorMessage = (data: any, response: Response) => {
  const message = data?.message || data?.error;

  // Validation errors come as { message: { field: ['…'] } } or ['…']
  if (message && typeof message === 'object') {
    return Object.values(message).flat().join(' ');
  }

  return message || `Request failed: ${response.status}`;
};

interface CommitOptionsI {
  branch: string;
  commitMessage: string;
  files: TokenFileI[];
  /**
   * Builds the commit on top of this branch and force-resets `branch` to it,
   * creating `branch` if it doesn't exist yet
   */
  startBranch?: string;
}

/** Commits every file in one commit. Throws with GitLab's message. */
export const commitFilesToGitlab = async (
  api: GitlabApiI,
  { branch, commitMessage, files, startBranch }: CommitOptionsI
) => {
  const { baseUrl, headers } = api;
  // The commit replaces the branch with one on top of startBranch, so the
  // files have to be looked up there
  const ref = startBranch || branch;

  // Gitlab needs to know upfront whether a file is created or updated. A failed
  // check is not conclusive, so those files are retried with the other action.
  const fileExists = async (path: string): Promise<boolean | null> => {
    try {
      const response = await fetch(
        `${baseUrl}/repository/files/${encodeURIComponent(
          path
        )}?ref=${encodeURIComponent(ref)}`,
        { method: 'HEAD', headers }
      );

      if (response.ok) return true;
      if (response.status === 404) return false;

      return null;
    } catch (error) {
      console.warn('Could not check if the file exists', path, error);
      return null;
    }
  };

  const checks = await Promise.all(
    files.map(async (file) => ({
      file,
      exists: await fileExists(file.path),
    }))
  );

  const toActions = (flipUnknown: boolean) =>
    checks.map(({ file, exists }) => ({
      action:
        exists === null
          ? flipUnknown
            ? 'create'
            : 'update'
          : exists
          ? 'update'
          : 'create',
      file_path: file.path,
      content: file.content,
    }));

  const commit = (actions: Record<string, string>[]) =>
    fetch(`${baseUrl}/repository/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        branch,
        commit_message: commitMessage,
        actions,
        ...(startBranch ? { start_branch: startBranch, force: true } : {}),
      }),
    });

  let response = await commit(toActions(false));
  let data = await readGitlabResponse(response);

  const hasUncertainFiles = checks.some(({ exists }) => exists === null);
  const isActionMismatch = /exists|does ?n[o']t exist/i.test(
    typeof data?.message === 'string' ? data.message : ''
  );

  if (!response.ok && hasUncertainFiles && isActionMismatch) {
    console.warn('Retrying the commit with the other action', data.message);
    response = await commit(toActions(true));
    data = await readGitlabResponse(response);
  }

  if (!response.ok) {
    throw new Error(getGitlabErrorMessage(data, response));
  }

  return data;
};
