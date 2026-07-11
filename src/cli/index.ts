/// <reference path="../../global.d.ts" />

import yargs from 'yargs';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { RestAPIResolver } from './restApiResolver';
import { getTokens } from '@common/export';

const defaultConfig: ExportSettingsI = {
  includedStyles: {
    text: {
      isIncluded: false,
      customName: 'Typography-styles',
    },
    effects: {
      isIncluded: false,
      customName: 'Effect-styles',
    },
    grids: {
      isIncluded: false,
      customName: 'Grid-styles',
    },
    colors: {
      isIncluded: false,
      customName: 'Color-styles',
    },
  },
  storeStyleInCollection: 'none',
  colorMode: 'hex',
  includeScopes: false,
  includeValueStringKeyToAlias: false,
  includeFigmaMetaData: false,
  useDTCG: true,
  usePercentageOpacity: false,
  splitByCollection: false,
  splitByMode: false,
  omitCollectionNames: false,
};

const argv = yargs(process.argv.slice(2))
  .option('api-key', {
    alias: 'a',
    description: 'Figma personal access token (PAT)',
    type: 'string',
  })
  .option('oauth-token', {
    alias: 't',
    description: 'Figma OAuth token',
    type: 'string',
  })
  .check((args) => {
    if (!args['api-key'] && !args['oauth-token']) {
      throw new Error('Either --api-key or --oauth-token must be provided');
    }
    return true;
  })
  .option('file-key', {
    alias: 'f',
    description: 'Figma file key',
    type: 'string',
    demandOption: true,
  })
  .option('config', {
    alias: 'c',
    description: 'Path to configuration file',
    type: 'string',
  })
  .option('output', {
    alias: 'o',
    description:
      'Path to output file or directory (when --split-by-collection)',
    type: 'string',
    demandOption: true,
  })
  .option('split-by-collection', {
    alias: 's',
    description:
      'Write each collection as a separate .tokens.json file in the output directory',
    type: 'boolean',
    default: false,
  })
  .option('split-by-mode', {
    alias: 'm',
    description:
      'Write each mode as a separate .tokens.json file under its collection directory',
    type: 'boolean',
    default: false,
  })
  .option('omit-collection-names', {
    description:
      'Omit collection names as top-level groups; merge all tokens into a single namespace',
    type: 'boolean',
    default: false,
  })
  .help()
  .alias('help', 'h')
  .parseSync();

let config = {};

if (argv.config) {
  try {
    const configFile = readFileSync(argv.config, 'utf-8');
    config = JSON.parse(configFile);
  } catch (error) {
    console.error('Error reading configuration file:', error);
    process.exit(1);
  }
}

const options: ExportSettingsI = {
  ...defaultConfig,
  ...config,
  // Support legacy `useDTCGKeys` config files (deprecated alias)
  useDTCG:
    (config as any).useDTCG ??
    (config as any).useDTCGKeys ??
    defaultConfig.useDTCG,
  splitByCollection:
    (config as any).splitByCollection ?? argv['split-by-collection'],
  splitByMode: (config as any).splitByMode ?? argv['split-by-mode'],
  omitCollectionNames:
    (config as any).omitCollectionNames ?? argv['omit-collection-names'],
};

async function exportFigmaTokens() {
  const resolver = new RestAPIResolver(
    argv.fileKey,
    argv.apiKey,
    argv.oauthToken
  );
  const tokens = await getTokens(resolver, options);
  try {
    if (options.splitByMode) {
      // Keys are "CollectionName/ModeName" — write as {output}/{CollectionName}/{ModeName}.tokens.json
      for (const key of Object.keys(tokens)) {
        const slashIndex = key.indexOf('/');
        let filePath: string;
        let fileContent: Record<string, any>;
        if (slashIndex !== -1) {
          const collectionName = key.slice(0, slashIndex);
          const modeName = key.slice(slashIndex + 1);
          const safeCollection = collectionName.replace(/[/\\?%*:|"<>]/g, '-');
          const safeMode = modeName.replace(/[/\\?%*:|"<>]/g, '-');
          filePath = join(
            argv.output,
            safeCollection,
            `${safeMode}.tokens.json`
          );
          fileContent = { [collectionName]: tokens[key] };
        } else {
          const safeFileName = key.replace(/[/\\?%*:|"<>]/g, '-');
          filePath = join(argv.output, `${safeFileName}.tokens.json`);
          fileContent = { [key]: tokens[key] };
        }
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf-8');
        console.log('✨ Written', filePath);
      }
    } else if (options.splitByCollection) {
      mkdirSync(argv.output, { recursive: true });
      for (const collectionName of Object.keys(tokens)) {
        const safeFileName = collectionName.replace(/[/\\?%*:|"<>]/g, '-');
        const filePath = join(argv.output, `${safeFileName}.tokens.json`);
        writeFileSync(
          filePath,
          JSON.stringify({ [collectionName]: tokens[collectionName] }, null, 2),
          'utf-8'
        );
        console.log('✨ Written', filePath);
      }
    } else {
      mkdirSync(dirname(argv.output), { recursive: true });
      writeFileSync(argv.output, JSON.stringify(tokens, null, 2), 'utf-8');
      console.log('✨ Tokens successfully written to', argv.output);
    }
  } catch (error) {
    console.error('🔴 Error writing to output file:', error);
    process.exit(1);
  }
}

exportFigmaTokens();
