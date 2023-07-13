export const pushToCustomURL = async (
  credentials: CustomURLCredentialsI,
  tokens: any
) => {
  // upload JSON to custom URL
  const url = credentials.url;
  const method = credentials.method;
  const headers = JSON.parse(credentials.headers);
  const body = JSON.stringify(tokens, null, 2);

  fetch(url, {
    method: method,
    headers: headers,
    body: body,
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Success:", data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
};
