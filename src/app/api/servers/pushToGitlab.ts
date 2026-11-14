import {
  splitTokensIntoFiles,
  SplitOptionsI,
} from '../../../common/transform/splitTokensIntoFiles';
import { commitFilesToGitlab, createGitlabApi } from './gitlabCommit';

export const pushToGitlab = async (
  credentials: GitlabCredentialsI,
  tokens: any,
  toastCallback: (props: ToastIPropsI) => void,
  splitOptions: SplitOptionsI = {}
) => {
  const files = splitTokensIntoFiles(
    tokens,
    splitOptions,
    credentials.fileName
  );

  const showError = (message: string) => {
    console.error('GitLab error:', message);
    toastCallback({
      title: 'GitLab: An error occurred',
      message: `Error: ${message}`,
      options: {
        type: 'error',
      },
    });
  };

  try {
    if (files.length === 0) {
      showError('There are no tokens to push');
      return;
    }

    // A single commit holds every file, even when the tokens are split
    await commitFilesToGitlab(createGitlabApi(credentials), {
      branch: credentials.branch,
      commitMessage: credentials.commitMessage || 'Update tokens',
      files,
    });

    toastCallback({
      title: 'GitLab: Updated successfully',
      message:
        files.length > 1
          ? `${files.length} token files on GitLab have been updated successfully`
          : 'Tokens on GitLab have been updated successfully',
      options: {
        type: 'success',
      },
    });
  } catch (error) {
    showError(error.message);
  }
};
