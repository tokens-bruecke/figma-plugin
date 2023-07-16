import { changeUIFrameSize } from "../utils/changeUIFrameSize";
import { config } from "../utils/config";

////////////////////////
// IMPORT TOKENS ///////
////////////////////////

export const importController = () => {
  if (figma.command === "import") {
    figma.showUI(__uiFiles__["import"], {
      width: config.frameWidth,
      height: 260,
      themeColors: true,
    });

    figma.ui.onmessage = async (msg) => {
      // change size of UI
      changeUIFrameSize(msg);

      //
      if (msg.type === "importTokens") {
        const tokensFile = msg.tokens;
        const fileMeta = tokensFile["$meta"] as MetaPropsI;

        // // separate file into collections
        const tokensCollections = fileMeta.variableCollections.map((name) => {
          // console.log("name", name);

          // console.log("tokensFile[name]", tokensFile[name]);

          return {
            [name]: tokensFile[name],
          };
        });

        console.log("tokensCollections", tokensCollections);

        tokensCollections.forEach((collection) => {
          const collectionName = Object.keys(collection)[0];

          // console.log("collectionName", collectionName);
          figma.variables.createVariableCollection(collectionName);

          const collectionVariables = collection[collectionName];

          console.log("collectionVariables", collectionVariables);
        });
      }
    };
  }
};
