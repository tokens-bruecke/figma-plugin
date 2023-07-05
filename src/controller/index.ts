import { generateTokens } from "../utils/generateTokens";

// clear console on reload
console.clear();

if (figma.command === "export") {
  figma.showUI(__uiFiles__["export"], {
    width: 300,
    height: 500,
    themeColors: true,
  });

  let JSONSettingsConfig: JSONSettingsConfigI;

  // get all styles from the document
  // const getStyles = async () => {
  //   const styles = figma.getLocalPaintStyles();
  //   const textStyles = figma.getLocalTextStyles();
  //   const effectStyles = figma.getLocalEffectStyles();
  //   const gridStyles = figma.getLocalGridStyles();

  //   return {
  //     styles,
  //     textStyles,
  //     effectStyles,
  //     gridStyles,
  //   };
  // };

  // getStyles().then((styles) => {
  //   console.log("styles", styles);
  // });

  const getTokens = async () => {
    const variableCollection =
      figma.variables.getLocalVariableCollections() as VariableCollection[];
    const variables = figma.variables.getLocalVariables() as Variable[];

    const mergedVariables = generateTokens(
      variables,
      variableCollection,
      JSONSettingsConfig
    );

    return mergedVariables;
  };

  // console.log(mergedVariables);
  // const JSONToTokens = variablesToTokens(variables);
  // console.log(JSONToTokens);

  // listen for messages from the UI
  figma.ui.onmessage = async (msg) => {
    // get JSON settings config from UI and store it in a variable
    if (msg.type === "JSONSettingsConfig") {
      JSONSettingsConfig = msg.config;

      console.log("JSONSettingsConfig", JSONSettingsConfig);
    }

    // generate tokens and send them to the UI
    if (msg.type === "generateTokens") {
      await getTokens().then((mergedVariables) => {
        figma.ui.postMessage({
          type: "tokens",
          tokens: mergedVariables,
        });
      });
    }
  };
}

if (figma.command === "import") {
  // show notification
  figma.notify("Importing tokens from JSON file...");
}
