import { stylesToTokens } from "../utils/styles/stylesToTokens";

import { variablesToTokens } from "../utils/variablesToTokens";
import { mergeStylesIntoTokens } from "../utils/mergeStylesIntoTokens";
import { IResolver } from "./resolver";

export const getTokens = async (
  resolver: IResolver,
  config: ExportSettingsI,
  state?: PluginStateI
) => {
  const variableCollection = await resolver.getLocalVariableCollections();
  const variables = await resolver.getLocalVariables();

  // convert variables to tokens
  const variableTokens = await variablesToTokens(
    variables,
    variableCollection,
    config,
    resolver
  );

  // convert styles to tokens
  const styleTokens = await stylesToTokens(config, resolver);

  // merge variables and styles
  const mergedVariables = mergeStylesIntoTokens(
    variableTokens,
    styleTokens,
    config.storeStyleInCollection
  );

  // add meta to mergedVariables
  const metaData = {
    useDTCGKeys: config.useDTCGKeys,
    colorMode: config.colorMode,
    variableCollections: state?.variableCollections,
    createdAt: new Date().toISOString(),
  } as MetaPropsI;

  // add meta to mergedVariables
  mergedVariables["$extensions"] = {
    "tokens-bruecke-meta": metaData,
  };

  // console.log("mergedVariables", mergedVariables);

  return mergedVariables;
};
