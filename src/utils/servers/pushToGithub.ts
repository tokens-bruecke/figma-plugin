import { Buffer } from "buffer";
import { Octokit } from "@octokit/core";

export const pushToGithub = async (
  credentials: GithubCredentialsI,
  tokens: any
) => {
  // push JSON to Github
  // const ghToken =
  //   "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";
  // const ghUser = "PavelLaptev";
  // const ghRepo = "test-repo";
  // const branch = "main";
  // const fileName = "tokens6.json";
  // const commitMessage = "Update tokens.json";

  // console.log("Github credentials", credentials);

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

    console.log("File updated successfully:", response);
  } catch (error) {
    if (error.status === 404) {
      const response = await octokit.request(
        "PUT /repos/{owner}/{repo}/contents/{path}",
        commonPushParams
      );

      console.log("File created successfully:", response);
    } else {
      console.error("Error checking file existence:", error);
    }
  }
};
