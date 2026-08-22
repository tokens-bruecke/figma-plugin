import { Octokit } from '@octokit/core';
import {
  splitTokensIntoFiles,
  SplitOptionsI,
} from '../../../common/transform/splitTokensIntoFiles';

export const githubPullRequest = async (
  credentials: GithubPullRequestCredentialsI,
  tokens: any,
  toastCallback: (props: ToastIPropsI) => void,
  splitOptions: SplitOptionsI = {}
) => {
  const { token, owner, repo, baseBranch, fileName, pullRequestBody } =
    credentials;
  const branch = credentials.branch || 'tokens-bruecke/update-tokens';
  const commitMessage = credentials.commitMessage || 'Update tokens';
  const pullRequestTitle =
    credentials.pullRequestTitle || 'chore(tokens): update tokens';
  const files = splitTokensIntoFiles(tokens, splitOptions, fileName);

  const octokit = new Octokit({ auth: token });

  type Commit = Awaited<ReturnType<typeof createCommit>>;
  type Ref = Awaited<ReturnType<typeof getBaseBranch>>;

  await create();

  async function create() {
    try {
      console.log('start creating pull request');

      if (files.length === 0) {
        throw new Error('There are no tokens to push');
      }

      const commit = await createCommit();
      console.log('commit created');
      await createOrUpdateBranch(commit);
      console.log('branch created or updated');

      await createPullRequest();
      console.log('pull request created');
      toastCallback({
        title: 'Github: Updated successfully',
        message: 'Github Pull Request has been updated successfully',
        options: {
          type: 'success',
        },
      });
    } catch (error) {
      console.log('error creating pull request', error);
      toastCallback({
        title: 'Github: Error creating pull request',
        message: `Error creating pull request: ${error.message}.`,
        options: {
          type: 'error',
        },
      });
    }
  }

  function getBaseBranch() {
    return octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });
  }

  async function createCommit() {
    const baseBranch = await getBaseBranch();
    console.log('base branch fetched');
    const tree = await createTree(baseBranch);
    console.log('tree created');

    return octokit.request('POST /repos/{owner}/{repo}/git/commits', {
      owner,
      repo,
      message: commitMessage,
      tree: tree.data.sha,
      parents: [baseBranch.data.object.sha],
    });
  }

  async function createTree(baseRef: Ref) {
    return octokit.request('POST /repos/{owner}/{repo}/git/trees', {
      owner,
      repo,
      base_tree: baseRef.data.object.sha,
      tree: files.map((file) => ({
        path: file.path,
        // mode 100644 is regular file
        mode: '100644' as const,
        type: 'blob' as const,
        content: file.content,
      })),
    });
  }

  async function createOrUpdateBranch(commit: Commit) {
    if (await isBrunchExist(branch)) {
      console.log('update the branch');
      await updateBranch(commit);
    } else {
      console.log('create a branch');
      await createBranch(commit);
    }
  }

  function createBranch(commit: Commit) {
    return octokit.request('POST /repos/{owner}/{repo}/git/refs', {
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: commit.data.sha,
    });
  }

  function updateBranch(commit: Commit) {
    return octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.data.sha,
      force: true,
    });
  }

  async function createPullRequest() {
    if (await isPullRequestExist(branch)) {
      console.log('pull request already exist');
      return null;
    }

    return octokit.request('POST /repos/{owner}/{repo}/pulls', {
      owner,
      repo,
      title: pullRequestTitle,
      body: pullRequestBody,
      head: branch,
      base: baseBranch,
    });
  }

  async function isBrunchExist(branch: string) {
    try {
      await octokit.request('GET /repos/{owner}/{repo}/git/refs/{ref}', {
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      return true;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async function isPullRequestExist(branch: string) {
    const pullRequest = await octokit.request(
      'GET /repos/{owner}/{repo}/pulls',
      {
        owner,
        repo,
        head: branch,
      }
    );

    return pullRequest.data.length > 0;
  }
};
