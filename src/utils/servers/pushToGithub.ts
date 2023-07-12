import { Octokit } from "@octokit/core";
import { Buffer } from "buffer";

export const pushToGithub = async (json: any) => {
  // push JSON to Github
  const ghToken =
    "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";
  const ghUser = "PavelLaptev";
  const ghRepo = "test-repo";
  const branch = "main";
  const fileName = "tokens.json";

  const octokit = new Octokit({ auth: ghToken });

  try {
    const { data } = await octokit.request(
      "POST /repos/{owner}/{repo}/contents/{path}",
      {
        owner: ghUser,
        repo: ghRepo,
        path: "tokens.json",
        message: "Add tokens.json",
        content: Buffer.from(JSON.stringify(json)).toString("base64"),
      }
    );

    console.log("data", data);
  } catch (error) {
    console.error("error", error);
  }
};
