import { Octokit } from '@octokit/core';
import {
  splitTokensIntoFiles,
  SplitOptionsI,
} from '../../../common/transform/splitTokensIntoFiles';

export const pushToGithub = async (
  credentials: GithubCredentialsI,
  tokens: any,
  toastCallback: (props: ToastIPropsI) => void,
  splitOptions: SplitOptionsI = {}
) => {
  const ghToken = credentials.token;
  const ghUser = credentials.owner;
  const ghRepo = credentials.repo;
  const branch = credentials.branch;
  const fileName = credentials.fileName;
  const commitMessage = credentials.commitMessage || 'Update tokens';
  const files = splitTokensIntoFiles(tokens, splitOptions, fileName);

  const octokit = new Octokit({ auth: ghToken });

  const commonParams = {
    owner: ghUser,
    repo: ghRepo,
  };

  // The git data API is used instead of the contents API so that every file
  // ends up in a single commit when the tokens are split into several files.
  try {
    if (files.length === 0) {
      throw new Error('There are no tokens to push');
    }

    const { data: ref } = await octokit.request(
      'GET /repos/{owner}/{repo}/git/ref/{ref}',
      {
        ...commonParams,
        ref: `heads/${branch}`,
      }
    );

    const { data: baseCommit } = await octokit.request(
      'GET /repos/{owner}/{repo}/git/commits/{commit_sha}',
      {
        ...commonParams,
        commit_sha: ref.object.sha,
      }
    );

    const { data: tree } = await octokit.request(
      'POST /repos/{owner}/{repo}/git/trees',
      {
        ...commonParams,
        base_tree: baseCommit.tree.sha,
        tree: files.map((file) => ({
          path: file.path,
          // mode 100644 is regular file
          mode: '100644' as const,
          type: 'blob' as const,
          content: file.content,
        })),
      }
    );

    const { data: commit } = await octokit.request(
      'POST /repos/{owner}/{repo}/git/commits',
      {
        ...commonParams,
        message: commitMessage,
        tree: tree.sha,
        parents: [ref.object.sha],
      }
    );

    await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
      ...commonParams,
      ref: `heads/${branch}`,
      sha: commit.sha,
    });

    console.log('Files pushed successfully:', commit.sha);
    toastCallback({
      title: 'Github: Updated successfully',
      message:
        files.length > 1
          ? `${files.length} token files on Github have been updated successfully`
          : 'Tokens on Github have been updated successfully',
      options: {
        type: 'success',
      },
    });
  } catch (error) {
    console.error('Error pushing files:', error);

    toastCallback({
      title:
        error.status === 404
          ? 'Github: Not found'
          : 'Github: An error occurred',
      message:
        error.status === 404
          ? `Could not find "${branch}" in ${ghUser}/${ghRepo}. Check the repository name, the branch (it has to exist and have at least one commit) and the token scope.`
          : error.message,
      options: {
        type: 'error',
      },
    });
  }
};
