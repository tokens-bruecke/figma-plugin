export const pushToJSONBin = async (
  credentials: JsonbinCredentialsI,
  tokens: any,
  toastCallback: (props: ToastIPropsI) => void
) => {
  // console.log("JSONBin credentials", credentials);

  let response = null;

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

  async function requestBin() {
    // update existing bin
    if (credentials.id) {
      return fetch(`https://api.jsonbin.io/v3/b/${credentials.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': credentials.secretKey,
          'X-Bin-Name': credentials.name,
        },
        body: JSON.stringify(tokens),
      });
    }

    // create new bin
    return fetch(`https://api.jsonbin.io/v3/b`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': credentials.secretKey,
        'X-Bin-Name': credentials.name,
      },
      body: JSON.stringify(tokens),
    });
  }

  // handle response
  if (response.ok) {
    const json = await response.json();

    console.log('JSONBin success', json);

    toastCallback({
      title: 'JSONBin: Updated successfully',
      message: 'Tokens on JSONBin have been updated successfully',
      options: {
        type: 'success',
      },
    });

    return json;
  }

  // handle error
  console.log('JSONBin error', response);
  if (!response.ok) {
    toastCallback({
      title: 'JSONBin: Error pushing tokens',
      message: `Error pushing tokens to JSONBin: ${response.statusText}`,
      options: {
        type: 'error',
      },
    });
  }
};
