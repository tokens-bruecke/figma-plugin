export const pushToJSONBin = async (
  credentials: JsonbinCredentialsI,
  tokens: any
) => {
  console.log("JSONBin credentials", credentials);

  // let req = new XMLHttpRequest();

  // req.onreadystatechange = () => {
  //   if (req.readyState == XMLHttpRequest.DONE) {
  //     console.log("req", req);
  //   }
  // };

  // req.open("PUT", `https://api.jsonbin.io/v3/b`, true);
  // req.setRequestHeader("Content-Type", "application/json");
  // req.setRequestHeader("X-Master-Key", credentials.secretKey);
  // req.setRequestHeader("X-Bin-Name", credentials.name);
  // req.send('{"samp234le": "Hello World"}');
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
    return json;
  }

  throw new Error("Network response was not ok.");

  // const response = await fetch(`https://api.jsonbin.io/v3/b`, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     "X-Master-Key": credentials.secretKey,
  //     "X-Bin-Name": credentials.name,
  //   },
  //   body: JSON.stringify(tokens),
  // });

  // const response = await fetch(`https://api.jsonbin.io/v3/b`, {
  //   method: "PUT",
  //   headers: {
  //     "Content-Type": "application/json",
  //     "X-Master-Key": credentials.secretKey,
  //     "X-Bin-Name": credentials.name,
  //   },
  //   body: JSON.stringify(tokens),
  // });

  // // handle response
  // if (response.ok) {
  //   const json = await response.json();
  //   return json;
  // }

  // throw new Error("Network response was not ok.");
};
