#!/usr/bin/env ts-node
/// <reference path="../global.d.ts" />

import yargs from "yargs";
import { readFileSync, writeFileSync } from "fs";
import { RestAPIResolver } from "./resolvers/restApiResolver";
import { getTokens } from "./controller/export";

const defaultConfig: ExportSettingsI = {
  includedStyles: {
    colors: {
      isIncluded: false,
      customName: "Colors",
    },
    text: {
      isIncluded: false,
      customName: "Typography",
    },
    effects: {
      isIncluded: false,
      customName: "Effects",
    },
    grids: {
      isIncluded: false,
      customName: "Grids",
    },
  },
  variableCollections: [],
  selectedCollection: "none",
  colorMode: "hex",
  includeScopes: false,
  includeValueAliasString: false,
  useDTCGKeys: false,
};

const argv = yargs(process.argv.slice(2))
  .option("api-key", {
    alias: "a",
    description: "Figma API key",
    type: "string",
    demandOption: true,
  })
  .option("file-key", {
    alias: "f",
    description: "Figma file key",
    type: "string",
    demandOption: true,
  })
  .option("config", {
    alias: "c",
    description: "Path to configuration file",
    type: "string",
  })
  .option("output", {
    alias: "o",
    description: "Path to output file",
    type: "string",
    demandOption: true,
  })
  .help()
  .alias("help", "h")
  .parseSync();

let config = {};

if (argv.config) {
  try {
    const configFile = readFileSync(argv.config, "utf-8");
    config = JSON.parse(configFile);
  } catch (error) {
    console.error("Error reading configuration file:", error);
    process.exit(1);
  }
}

const options = {
  ...defaultConfig,
  ...config,
};

async function exportFigmaTokens() {
  const resolver = new RestAPIResolver(argv.fileKey, argv.apiKey);
  const tokens = await getTokens(options, resolver);
  try {
    writeFileSync(argv.output, JSON.stringify(tokens, null, 2), "utf-8");
    console.log("Tokens successfully written to", argv.output);
  } catch (error) {
    console.error("Error writing to output file:", error);
    process.exit(1);
  }
}

exportFigmaTokens();
