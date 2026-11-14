import {
  splitTokensIntoFiles,
  SplitOptionsI,
} from '../../../common/transform/splitTokensIntoFiles';
import {
  commitFilesToGitlab,
  createGitlabApi,
  getGitlabErrorMessage,
  GitlabApiI,
  readGitlabResponse,
} from './gitlabCommit';

export const DEFAULT_MR_BRANCH = 'tokens-bruecke/update-tokens';
export const DEFAULT_MR_TITLE = 'chore(tokens): update tokens';

/**
 * Returns the open merge request from `sourceBranch` into `targetBranch`, or
 * opens one. A push to the source branch already updates an open one.
 */
export const openGitlabMergeRequest = async (
  api: GitlabApiI,
  {
    sourceBranch,
    targetBranch,
    title,
    description,
  }: {
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description?: string;
  }
): Promise<{ url: string | null; created: boolean }> => {
  const query = new URLSearchParams({
    source_branch: sourceBranch,
    target_branch: targetBranch,
    state: 'opened',
  });
  const listResponse = await fetch(`${api.baseUrl}/merge_requests?${query}`, {
    headers: api.headers,
  });
  const list = await readGitlabResponse(listResponse);

  if (!listResponse.ok) {
    throw new Error(getGitlabErrorMessage(list, listResponse));
  }

  if (Array.isArray(list) && list.length > 0) {
    return { url: list[0].web_url ?? null, created: false };
  }

  const createResponse = await fetch(`${api.baseUrl}/merge_requests`, {
    method: 'POST',
    headers: api.headers,
    body: JSON.stringify({
      source_branch: sourceBranch,
      target_branch: targetBranch,
      title,
      ...(description ? { description } : {}),
    }),
  });
  const created = await readGitlabResponse(createResponse);

  if (!createResponse.ok) {
    throw new Error(getGitlabErrorMessage(created, createResponse));
  }

  return { url: created.web_url ?? null, created: true };
};

export const gitlabMergeRequest = async (
  credentials: GitlabMergeRequestCredentialsI,
  tokens: any,
  toastCallback: (props: ToastIPropsI) => void,
  splitOptions: SplitOptionsI = {}
) => {
  const { baseBranch } = credentials;
  const branch = credentials.branch || DEFAULT_MR_BRANCH;
  const files = splitTokensIntoFiles(
    tokens,
    splitOptions,
    credentials.fileName
  );

  try {
    if (files.length === 0) {
      throw new Error('There are no tokens to push');
    }

    const api = createGitlabApi(credentials);

    // Like the GitHub PR: the branch is reset to one commit on top of the
    // base branch, so the merge request only ever shows the token changes
    await commitFilesToGitlab(api, {
      branch,
      startBranch: baseBranch,
      commitMessage: credentials.commitMessage || 'Update tokens',
      files,
    });

    const { url, created } = await openGitlabMergeRequest(api, {
      sourceBranch: branch,
      targetBranch: baseBranch,
      title: credentials.mergeRequestTitle || DEFAULT_MR_TITLE,
      description: credentials.mergeRequestDescription,
    });

    toastCallback({
      title: created
        ? 'GitLab: Merge request created'
        : 'GitLab: Merge request updated',
      message: created
        ? 'GitLab merge request has been created successfully'
        : 'GitLab merge request has been updated successfully',
      link: url ? { label: 'Open Merge Request', url } : undefined,
      options: {
        type: 'success',
        timeout: 15000,
      },
    });
  } catch (error) {
    console.error('Error creating merge request:', error);
    toastCallback({
      title: 'GitLab: Error creating merge request',
      message: `Error creating merge request: ${error.message}.`,
      options: {
        type: 'error',
      },
    });
  }
};
