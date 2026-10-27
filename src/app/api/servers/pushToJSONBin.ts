/**
 * JSONBin answers errors with `{ message }`, and `statusText` is empty over
 * HTTP/2, so the body is the only useful reason.
 */
const readErrorMessage = async (response: Response) => {
  const body = await response.text().catch(() => '');

  try {
    const message = JSON.parse(body)?.message;
    if (message) return `${response.status} ${message}`;
  } catch {
    // not JSON
  }

  return `${response.status} ${body || response.statusText}`.trim();
};

export const pushToJSONBin = async (
  credentials: JsonbinCredentialsI,
  tokens: any,
  toastCallback: (props: ToastIPropsI) => void,
  // Receives the id of a bin created by the push, so the next push updates
  // that bin instead of creating another one
  onBinCreated?: (binId: string) => void
) => {
  const isUpdate = !!credentials.id;
  let response: Response = null;

  try {
    response = await requestBin();
  } catch (error) {
    // A network error rejects instead of returning a response
    toastCallback({
      title: 'JSONBin: Error pushing tokens',
      message: `Error pushing tokens to JSONBin: ${error.message}`,
      options: {
        type: 'error',
      },
    });
    return;
  }

  function requestBin() {
    const headers = {
      'Content-Type': 'application/json',
      'X-Master-Key': credentials.secretKey,
      'X-Bin-Name': credentials.name,
    };

    // update existing bin
    if (isUpdate) {
      return fetch(`https://api.jsonbin.io/v3/b/${credentials.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(tokens),
      });
    }

    // create new bin
    return fetch(`https://api.jsonbin.io/v3/b`, {
      method: 'POST',
      headers,
      body: JSON.stringify(tokens),
    });
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    console.error('JSONBin error:', message);
    toastCallback({
      title: 'JSONBin: Error pushing tokens',
      message: `Error pushing tokens to JSONBin: ${message}`,
      options: {
        type: 'error',
      },
    });
    return;
  }

  const json = await response.json().catch(() => null);
  const createdBinId: string | undefined = !isUpdate
    ? json?.metadata?.id
    : undefined;

  if (createdBinId) {
    onBinCreated?.(createdBinId);
  }

  toastCallback({
    title: 'JSONBin: Updated successfully',
    message: createdBinId
      ? `Created the bin ${createdBinId}. It is saved as the Bin ID, so the next push updates it.`
      : 'Tokens on JSONBin have been updated successfully',
    options: {
      type: 'success',
    },
  });

  return json;
};
