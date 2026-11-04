import { getGitlabProjectId, normalizeGitlabHost } from './gitlabProject';

export interface ConnectionResultI {
  ok: boolean;
  message: string;
  /** The form field the problem belongs to */
  fieldId?: string;
}

// Read-only requests: they check token, repository and branch without
// writing anything, so the user learns about a typo before the first push.

const githubRequest = (path: string, token: string) =>
  fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
    },
  });

const testGithub = async (
  credentials: GithubCredentialsI | GithubPullRequestCredentialsI,
  branchFieldId: 'branch' | 'baseBranch'
): Promise<ConnectionResultI> => {
  const { token, owner, repo } = credentials;
  const branch =
    branchFieldId === 'baseBranch'
      ? (credentials as GithubPullRequestCredentialsI).baseBranch
      : credentials.branch;
  const name = `${owner}/${repo}`;

  const repoResponse = await githubRequest(`/repos/${name}`, token);

  if (repoResponse.status === 401) {
    return {
      ok: false,
      fieldId: 'token',
      message:
        'GitHub rejected the token. Check that it is complete and not expired.',
    };
  }

  if (!repoResponse.ok) {
    return {
      ok: false,
      fieldId: 'repository',
      message: `Can't find ${name}. Check the name, or give the token access to this repository.`,
    };
  }

  const repoData = await repoResponse.json();

  if (repoData.permissions && !repoData.permissions.push) {
    return {
      ok: false,
      fieldId: 'token',
      message: `The token can read ${name} but not write to it.`,
    };
  }

  const branchResponse = await githubRequest(
    `/repos/${name}/branches/${encodeURIComponent(branch)}`,
    token
  );

  if (!branchResponse.ok) {
    return {
      ok: false,
      fieldId: branchFieldId,
      message: `${name} has no branch "${branch}".`,
    };
  }

  return { ok: true, message: `Connected to ${name} · ${branch}` };
};

const testGitlab = async (
  credentials: GitlabCredentialsI
): Promise<ConnectionResultI> => {
  const host = normalizeGitlabHost(credentials.host);
  const projectId = getGitlabProjectId(credentials.owner, credentials.repo);
  const baseUrl = `https://${host}/api/v4/projects/${projectId}`;
  const headers = { 'PRIVATE-TOKEN': credentials.token };
  const name = decodeURIComponent(projectId);

  const projectResponse = await fetch(baseUrl, { headers });

  if (projectResponse.status === 401) {
    return {
      ok: false,
      fieldId: 'token',
      message: `${host} rejected the token. Check that it is complete, not expired and has the api scope.`,
    };
  }

  if (!projectResponse.ok) {
    return {
      ok: false,
      fieldId: 'project',
      message: `Can't find ${name} on ${host}. Check the URL, or the token's access to this project.`,
    };
  }

  const branchResponse = await fetch(
    `${baseUrl}/repository/branches/${encodeURIComponent(credentials.branch)}`,
    { headers }
  );

  if (!branchResponse.ok) {
    return {
      ok: false,
      fieldId: 'branch',
      message: `${name} has no branch "${credentials.branch}".`,
    };
  }

  return { ok: true, message: `Connected to ${name} · ${credentials.branch}` };
};

export const testConnection = async (
  server: ServerType,
  credentials: ServerSettingsI[ServerType]
): Promise<ConnectionResultI> => {
  try {
    if (server === 'github') {
      return await testGithub(credentials as GithubCredentialsI, 'branch');
    }

    if (server === 'githubPullRequest') {
      return await testGithub(
        credentials as GithubPullRequestCredentialsI,
        'baseBranch'
      );
    }

    if (server === 'gitlab') {
      return await testGitlab(credentials as GitlabCredentialsI);
    }

    return { ok: false, message: 'This server has no connection test.' };
  } catch {
    // fetch only rejects when the server can't be reached at all
    const host =
      server === 'gitlab'
        ? normalizeGitlabHost((credentials as GitlabCredentialsI).host)
        : 'api.github.com';

    return {
      ok: false,
      // a mistyped self-managed host is the likely cause
      fieldId: server === 'gitlab' ? 'project' : undefined,
      message: `Can't reach ${host}. Check the address and your network.`,
    };
  }
};
