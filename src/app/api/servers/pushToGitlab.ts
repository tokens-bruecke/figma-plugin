import {
  splitTokensIntoFiles,
  SplitOptionsI,
} from '../../../common/transform/splitTokensIntoFiles';

export const pushToGitlab = async (
  credentials: GitlabCredentialsI,
  tokens: any,
  toastCallback: (props: ToastIPropsI) => void,
  splitOptions: SplitOptionsI = {}
) => {
  const glToken = credentials.token;
  const glUser = credentials.owner;
  const glRepo = credentials.repo;
  const branch = credentials.branch;
  const glHost = credentials.host || 'gitlab.com';
  const commitMessage = credentials.commitMessage || 'Update tokens';
  const files = splitTokensIntoFiles(
    tokens,
    splitOptions,
    credentials.fileName
  );

  const projectId = `${glUser}%2F${glRepo}`;
  const baseUrl = `https://${glHost}/api/v4/projects/${projectId}`;
  const headers = {
    'Content-Type': 'application/json',
    'PRIVATE-TOKEN': glToken,
  };

  const showError = (message: string) => {
    console.error('Gitlab error:', message);
    toastCallback({
      title: 'Gitlab: An error occured',
      message: `Error: ${message}`,
      options: {
        type: 'error',
      },
    });
  };

  // Gitlab needs to know upfront whether a file is created or updated. A failed
  // check is not conclusive, so those files are retried with the other action.
  const fileExists = async (path: string): Promise<boolean | null> => {
    try {
      const response = await fetch(
        `${baseUrl}/repository/files/${encodeURIComponent(
          path
        )}?ref=${encodeURIComponent(branch)}`,
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

  const commitFiles = (actions: Record<string, string>[]) =>
    fetch(`${baseUrl}/repository/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        branch,
        commit_message: commitMessage,
        actions,
      }),
    });

  const readResponse = async (response: Response) => {
    const body = await response.text();

    try {
      return JSON.parse(body);
    } catch {
      return { message: body || `Request failed: ${response.status}` };
    }
  };

  try {
    if (files.length === 0) {
      showError('There are no tokens to push');
      return;
    }

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

    // A single commit holds every file, even when the tokens are split
    let response = await commitFiles(toActions(false));
    let data = await readResponse(response);

    const hasUncertainFiles = checks.some(({ exists }) => exists === null);
    const isActionMismatch = /exists|does ?n[o']t exist/i.test(
      data?.message || ''
    );

    if (!response.ok && hasUncertainFiles && isActionMismatch) {
      console.warn('Retrying the commit with the other action', data.message);
      response = await commitFiles(toActions(true));
      data = await readResponse(response);
    }

    if (!response.ok) {
      showError(
        data?.message || data?.error || `Request failed: ${response.status}`
      );
      return;
    }

    console.log('Gitlab response', data);
    toastCallback({
      title: 'Gitlab: Updated successfully',
      message:
        files.length > 1
          ? `${files.length} token files on Gitlab have been updated successfully`
          : 'Tokens on Gitlab have been updated successfully',
      options: {
        type: 'success',
      },
    });
  } catch (error) {
    showError(error.message);
  }
};
