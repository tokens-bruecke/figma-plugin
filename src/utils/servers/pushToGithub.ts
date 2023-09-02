import { Buffer } from "buffer";
import { Octokit } from "@octokit/core";

export const pushToGithub = async (
  credentials: GithubCredentialsI,
  tokens: any,
  toastCallback: (props: ToastIPropsI) => void
) => {
  const ghToken = credentials.token;
  const ghUser = credentials.owner;
  const ghRepo = credentials.repo;
  const branch = credentials.branch;
  const fileName = credentials.fileName;
  const commitMessage = credentials.commitMessage || "Update tokens";
  const fileContent = Buffer.from(JSON.stringify(tokens, null, 2)).toString(
    "base64"
  );

  const octokit = new Octokit({ auth: ghToken });

  const commonParams = {
    owner: ghUser,
    repo: ghRepo,
    path: fileName,
  };

  const commonPushParams = {
    ...commonParams,
    message: commitMessage,
    content: fileContent,
    branch: branch,
  };

  try {
    const { data: file } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        ...commonParams,
        ref: branch,
      }
    );

    const response = await octokit.request(
      "PUT /repos/{owner}/{repo}/contents/{path}",
      {
        ...commonPushParams,
        sha: file["sha"], // Use the existing sha when updating the file
      }
    );

    // handle status response
    console.log("File updated successfully:", response);
    toastCallback({
      title: "Github: Updated successfully",
      message: "Tokens on Github have been updated successfully",
      options: {
        type: "success",
      },
    });
  } catch (error) {
    // handle status response
    console.error("Error upating file:", error);

    if (error.status === 404) {
      try {
        const response = await octokit.request(
          "PUT /repos/{owner}/{repo}/contents/{path}",
          commonPushParams
        );

        // handle status response
        console.log("File created successfully:", response);
        toastCallback({
          title: "Github: Created successfully",
          message: "Tokens on Github have been created successfully",
          options: {
            type: "success",
          },
        });
      } catch (error) {
        // handle status response
        console.error("Error creating file:", error);
        toastCallback({
          title: "Github: Error creating file",
          message: `Error creating file: ${error.message}.`,
          options: {
            type: "error",
          },
        });
      }
    } else {
      toastCallback({
        title: "Github: An error occurred",
        message: error.message,
        options: {
          type: "error",
        },
      });
    }
  }
};
