export const pushToCustomURL = async (
  credentials: CustomURLCredentialsI,
  tokens: any,
  toastCallback: (props: ToastIPropsI) => void
) => {
  const showError = (message: string) => {
    console.error('Custom URL error:', message);
    toastCallback({
      title: 'Custom URL: An error occurred',
      message,
      options: {
        type: 'error',
      },
    });
  };

  // The headers field is optional, so it is often empty
  let headers: Record<string, string> = {};
  try {
    headers = credentials.headers?.trim()
      ? JSON.parse(credentials.headers)
      : {};
  } catch (error) {
    showError(
      `The headers are not valid JSON (${error.message}). Use an object, e.g. {"Authorization": "Bearer …"}.`
    );
    return;
  }

  try {
    const response = await fetch(credentials.url, {
      method: credentials.method || 'POST',
      headers,
      body: JSON.stringify(tokens, null, 2),
    });

    if (!response.ok) {
      showError(`Request failed: ${response.status} ${response.statusText}`);
      return;
    }

    toastCallback({
      title: 'Custom URL: Pushed successfully',
      message: 'Tokens have been sent to the custom URL',
      options: {
        type: 'success',
      },
    });
  } catch (error) {
    showError(error.message);
  }
};
