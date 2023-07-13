export const pushToJSONBin = async (
  credentials: JsonbinCredentialsI,
  tokens: any
) => {
  // console.log("JSONBin credentials", credentials);

  let response;

  // update existing bin
  if (credentials.id) {
    response = await fetch(`https://api.jsonbin.io/v3/b/${credentials.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": credentials.secretKey,
        "X-Bin-Name": credentials.name,
      },
      body: JSON.stringify(tokens),
    });
  }

  // create new bin
  if (!credentials.id) {
    response = await fetch(`https://api.jsonbin.io/v3/b`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": credentials.secretKey,
        "X-Bin-Name": credentials.name,
      },
      body: JSON.stringify(tokens),
    });
  }

  // handle response
  if (response.ok) {
    const json = await response.json();

    console.log("JSONBin response", json);

    return json;
  }

  throw new Error("Network response was not ok.");
};
