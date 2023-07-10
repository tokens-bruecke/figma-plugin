export const pushToJSONBin = async (
  credentials: JsonbinCredentialsI,
  tokens: any
) => {
  const response = await fetch(`https://api.jsonbin.io/v3/b`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": credentials.secretKey,
      "X-Bin-Name": credentials.name,
    },
    body: JSON.stringify(tokens),
  });

  const data = await response.json();

  console.log("data", data);
};
