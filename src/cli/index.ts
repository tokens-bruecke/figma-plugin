/// <reference path="../../global.d.ts" />

import yargs from 'yargs';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { RestAPIResolver } from './restApiResolver';
import { FileResolver, parseSnapshot } from './fileResolver';
import { getTokens } from '@common/export';
import { log, setQuiet } from './logger';

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

// Flags that only make sense when fetching from the REST API
const REST_FLAGS = [
  '--api-key',
  '-a',
  '--oauth-token',
  '-t',
  '--file-key',
  '-f',
];

const argv = yargs(process.argv.slice(2))
  // Read FIGMA_-prefixed env vars: FIGMA_API_KEY, FIGMA_OAUTH_TOKEN, FIGMA_FILE_KEY, ...
  // Explicit CLI flags take precedence over env vars
  .env('FIGMA')
  .option('api-key', {
    alias: 'a',
    description: 'Figma personal access token (PAT) [env: FIGMA_API_KEY]',
    type: 'string',
  })
  .option('oauth-token', {
    alias: 't',
    description: 'Figma OAuth token [env: FIGMA_OAUTH_TOKEN]',
    type: 'string',
  })
  .option('file-key', {
    alias: 'f',
    description: 'Figma file key [env: FIGMA_FILE_KEY]',
    type: 'string',
  })
  .option('input', {
    alias: 'i',
    description:
      'Read a local tokens snapshot instead of calling the Figma REST API ("-" reads stdin). See schemas/tokens-snapshot.schema.json',
    type: 'string',
  })
  .check((args) => {
    if (args.input) {
      // Env vars are ignored in snapshot mode; only explicit flags are a conflict
      const conflicting = REST_FLAGS.filter((flag) =>
        process.argv
          .slice(2)
          .some((arg) => arg === flag || arg.startsWith(`${flag}=`))
      );
      if (conflicting.length > 0) {
        throw new Error(
          `--input reads a local snapshot and cannot be combined with ${conflicting.join(
            ', '
          )}`
        );
      }
      return true;
    }
    if (!args['api-key'] && !args['oauth-token']) {
      throw new Error(
        'Either --api-key or --oauth-token must be provided (or set FIGMA_API_KEY / FIGMA_OAUTH_TOKEN), or use --input to read a local snapshot'
      );
    }
    if (!args['file-key']) {
      throw new Error(
        'Missing required argument: file-key (or set FIGMA_FILE_KEY), or use --input to read a local snapshot'
      );
    }
    return true;
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
  })
  .option('stdout', {
    description:
      'Print tokens JSON to stdout instead of writing a file (progress logs go to stderr)',
    type: 'boolean',
    default: false,
  })
  .option('split-by-collection', {
    alias: 's',
    description:
      'Write each collection as a separate .tokens.json file in the output directory',
    type: 'boolean',
  })
  .option('split-by-mode', {
    alias: 'm',
    description:
      'Write each mode as a separate .tokens.json file under its collection directory',
    type: 'boolean',
  })
  .option('omit-collection-names', {
    description:
      'Omit collection names as top-level groups; merge all tokens into a single namespace',
    type: 'boolean',
  })
  .option('quiet', {
    alias: 'q',
    description: 'Suppress progress logs (errors are still printed)',
    type: 'boolean',
    default: false,
  })
  .check((args) => {
    if (!args.stdout && !args.output) {
      throw new Error('Either --output or --stdout must be provided');
    }
    if (args.stdout && args.output) {
      throw new Error('--output and --stdout are mutually exclusive');
    }
    if (args.stdout && (args['split-by-collection'] || args['split-by-mode'])) {
      throw new Error(
        '--stdout cannot be combined with --split-by-collection or --split-by-mode (splits produce multiple files)'
      );
    }
    return true;
  })
  .help()
  .alias('help', 'h')
  .epilogue(
    [
      'Environment variables: options can be set via FIGMA_-prefixed env vars',
      '(e.g. FIGMA_API_KEY, FIGMA_OAUTH_TOKEN, FIGMA_FILE_KEY). Explicit flags win.',
      '',
      'Docs & machine-readable references (also shipped in the npm package):',
      '  Config schema:    schemas/cli-options.schema.json',
      '  Snapshot schema:  schemas/tokens-snapshot.schema.json',
      '  Agent guide:      skills/tokens-bruecke/SKILL.md',
      '  Full docs:        https://github.com/tokens-bruecke/figma-plugin#use-as-cli-tool',
    ].join('\n')
  )
  .parseSync();

setQuiet(argv.quiet);

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
  // Explicit CLI flags override the config file, which overrides defaults
  splitByCollection:
    argv['split-by-collection'] ??
    (config as any).splitByCollection ??
    defaultConfig.splitByCollection,
  splitByMode:
    argv['split-by-mode'] ??
    (config as any).splitByMode ??
    defaultConfig.splitByMode,
  omitCollectionNames:
    argv['omit-collection-names'] ??
    (config as any).omitCollectionNames ??
    defaultConfig.omitCollectionNames,
};

function createSnapshotResolver(input: string) {
  const isStdin = input === '-';
  const source = isStdin ? 'stdin' : input;
  let raw: string;
  try {
    // fd 0 reads stdin; readFileSync handles pipes and redirects alike
    raw = readFileSync(isStdin ? 0 : input, 'utf-8');
  } catch (error: any) {
    console.error(
      `🔴 Error reading snapshot from ${source}:`,
      error?.message ?? error
    );
    process.exit(1);
  }

  try {
    log('⌛ Reading tokens snapshot from %s', source);
    return new FileResolver(parseSnapshot(raw, source));
  } catch (error: any) {
    console.error('🔴 Invalid tokens snapshot:', error?.message ?? error);
    console.error(
      'ℹ️  Expected shape is documented in schemas/tokens-snapshot.schema.json'
    );
    process.exit(1);
  }
}

async function exportFigmaTokens() {
  const resolver = argv.input
    ? createSnapshotResolver(argv.input)
    : new RestAPIResolver(argv.fileKey, argv.apiKey, argv.oauthToken);

  let tokens: Record<string, any>;
  try {
    tokens = await getTokens(resolver, options);
  } catch (error: any) {
    const message = error?.message ?? String(error);
    if (argv.input) {
      console.error('🔴 Error transforming tokens snapshot:', message);
      process.exit(1);
    }
    console.error('🔴 Error fetching tokens from Figma:', message);
    if (/403|forbidden/i.test(message)) {
      console.error(
        'ℹ️  The Figma Variables REST API requires a Figma Enterprise plan and a token with the file_variables:read scope.'
      );
    }
    if (/404|not found/i.test(message)) {
      console.error(
        'ℹ️  Check that the --file-key is correct and the token has access to the file.'
      );
    }
    process.exit(1);
  }

  if (argv.stdout) {
    process.stdout.write(JSON.stringify(tokens, null, 2) + '\n');
    return;
  }

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
        log('✨ Written', filePath);
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
        log('✨ Written', filePath);
      }
    } else {
      mkdirSync(dirname(argv.output), { recursive: true });
      writeFileSync(argv.output, JSON.stringify(tokens, null, 2), 'utf-8');
      log('✨ Tokens successfully written to', argv.output);
    }
  } catch (error) {
    console.error('🔴 Error writing to output file:', error);
    process.exit(1);
  }
}

exportFigmaTokens();
