export const pushToGitlab = async (
  credentials: GitlabCredentialsI,
  tokens: any,
  toastCallback: (props: ToastIPropsI) => void
) => {
  const glToken = credentials.token;
  const glUser = credentials.owner;
  const glRepo = credentials.repo;
  const branch = credentials.branch;
  const glHost = credentials.host || "gitlab.com";
  const fileName = credentials.fileName;
  const commitMessage = credentials.commitMessage || "Update tokens";
  const fileContent = JSON.stringify(tokens, null, 2);

  const payload = {
    branch: branch,
    commit_message: commitMessage,
    content: fileContent,
  };

  const fetchUrl = `https://${glHost}/api/v4/projects/${glUser}%2F${glRepo}/repository/files/${fileName}`;

  const gitlabRequest = async (method: "POST" | "PUT") => {
    try {
      const response = await fetch(fetchUrl, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "PRIVATE-TOKEN": glToken,
        },
        body: JSON.stringify(payload),
      });

      return await response.json();
    } catch (error) {
      console.error("Error:", error);
      toastCallback({
        title: "Gitlab: An error occured",
        message: `Error: ${error.message}`,
        options: {
          type: "error",
        },
      });

      return null;
    }
  };

  const data = await gitlabRequest("POST");

  console.log("Gitlab response", data);

  if (data.message) {
    if (data.message === "A file with this name already exists") {
      console.warn("File already exists, updating");

      await gitlabRequest("PUT");

      console.log("File updated successfully");
      toastCallback({
        title: "Gitlab: Updated successfully",
        message: "Tokens on Gitlab have been updated successfully",
        options: {
          type: "success",
        },
      });

      return;
    }

    console.error("Error:", data.message);
    toastCallback({
      title: "Gitlab: An error occured",
      message: `Error: ${data.message}`,
      options: {
        type: "error",
      },
    });
  } else {
    // handle status response
    // if file doesn't exist, create it
    console.log("File created successfully");
    toastCallback({
      title: "Gitlab: Created successfully",
      message: "Tokens on Gitlab have been created successfully",
      options: {
        type: "success",
      },
    });
  }
};
