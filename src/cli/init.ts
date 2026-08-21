/// <reference path="../../global.d.ts" />

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import {
  CONFIG_SCHEMA_URL,
  DEFAULT_CONFIG_FILENAME,
  defaultConfig,
} from './defaults';
import {
  ChoiceI,
  PromptCancelledError,
  PromptIoI,
  confirm,
  multiselect,
  select,
  supportsRawMode,
} from './prompt';

export interface InitAnswersI {
  colorMode: colorModeType;
  includedStyles: stylesType[];
  useDTCG: boolean;
  split: 'none' | 'collection' | 'mode';
}

const COLOR_MODES: { value: colorModeType; name: string; example: string }[] = [
  { value: 'hex', name: 'HEX', example: '"#3366ff"' },
  { value: 'rgba-css', name: 'RGBA CSS', example: '"rgba(51, 102, 255, 1)"' },
  { value: 'rgba-object', name: 'RGBA Object', example: '{ r, g, b, a }' },
  { value: 'srgb-dtcg', name: 'sRGB DTCG', example: 'DTCG color object' },
  {
    value: 'hsla-css',
    name: 'HSLA CSS',
    example: '"hsla(225, 100%, 60%, 1)"',
  },
  { value: 'hsla-object', name: 'HSLA Object', example: '{ h, s, l, a }' },
  { value: 'hsl-dtcg', name: 'HSL DTCG', example: 'DTCG color object' },
  { value: 'oklch-dtcg', name: 'OKLCH DTCG', example: 'DTCG color object' },
];

export const COLOR_MODE_CHOICES = COLOR_MODES.map((choice) => ({
  ...choice,
  // Padded form for the typed fallback, where there is no dim styling
  label: `${choice.name.padEnd(18)}${choice.example}`,
}));

export const STYLE_CHOICES: { value: stylesType; label: string }[] = [
  { value: 'colors', label: 'Color styles' },
  { value: 'text', label: 'Typography styles' },
  { value: 'effects', label: 'Effect styles' },
  { value: 'grids', label: 'Grid styles' },
];

export const SPLIT_CHOICES: { value: InitAnswersI['split']; label: string }[] =
  [
    { value: 'none', label: 'Single file' },
    { value: 'collection', label: 'One file per collection' },
    { value: 'mode', label: 'One file per mode' },
  ];

export const defaultAnswers: InitAnswersI = {
  colorMode: defaultConfig.colorMode,
  includedStyles: [],
  useDTCG: defaultConfig.useDTCG,
  split: 'none',
};

/**
 * Resolve a 1-based numeric answer against a choice list.
 * An empty answer keeps the default; anything else is rejected so a typo
 * never silently becomes a different setting.
 */
export const parseChoice = <T>(
  answer: string,
  choices: { value: T }[],
  fallback: T
): T => {
  const trimmed = answer.trim();
  if (trimmed === '') return fallback;
  const index = Number(trimmed);
  if (!Number.isInteger(index) || index < 1 || index > choices.length) {
    throw new Error(
      `Enter a number between 1 and ${choices.length} (or press Enter for the default)`
    );
  }
  return choices[index - 1].value;
};

/**
 * Resolve a comma/space separated list of 1-based numbers. Empty means none.
 */
export const parseMultiChoice = <T>(
  answer: string,
  choices: { value: T }[]
): T[] => {
  const trimmed = answer.trim();
  if (trimmed === '') return [];
  const picked: T[] = [];
  for (const part of trimmed.split(/[,\s]+/)) {
    const index = Number(part);
    if (!Number.isInteger(index) || index < 1 || index > choices.length) {
      throw new Error(
        `"${part}" is not a choice — enter numbers between 1 and ${choices.length}, separated by commas (or press Enter for none)`
      );
    }
    const { value } = choices[index - 1];
    if (!picked.includes(value)) picked.push(value);
  }
  return picked;
};

export const parseYesNo = (answer: string, fallback: boolean): boolean => {
  const trimmed = answer.trim().toLowerCase();
  if (trimmed === '') return fallback;
  if (['y', 'yes'].includes(trimmed)) return true;
  if (['n', 'no'].includes(trimmed)) return false;
  throw new Error('Answer y or n (or press Enter for the default)');
};

/**
 * Build a complete config from the answers. Every option is written, not just
 * the ones asked about, so the file itself documents the rest.
 */
export const buildConfig = (answers: InitAnswersI): Record<string, any> => ({
  $schema: CONFIG_SCHEMA_URL,
  ...defaultConfig,
  colorMode: answers.colorMode,
  useDTCG: answers.useDTCG,
  includedStyles: {
    text: {
      ...defaultConfig.includedStyles.text,
      isIncluded: answers.includedStyles.includes('text'),
    },
    colors: {
      ...defaultConfig.includedStyles.colors,
      isIncluded: answers.includedStyles.includes('colors'),
    },
    effects: {
      ...defaultConfig.includedStyles.effects,
      isIncluded: answers.includedStyles.includes('effects'),
    },
    grids: {
      ...defaultConfig.includedStyles.grids,
      isIncluded: answers.includedStyles.includes('grids'),
    },
  },
  splitByCollection: answers.split === 'collection',
  splitByMode: answers.split === 'mode',
});

const renderChoices = (choices: { label: string }[], defaultIndex?: number) =>
  choices
    .map((choice, i) => {
      const marker = defaultIndex === i ? '›' : ' ';
      return `  ${marker} ${i + 1}) ${choice.label}`;
    })
    .join('\n');

type Ask = (question: string) => Promise<string>;

/**
 * Re-ask until the answer parses, so a typo costs one line rather than the
 * whole run.
 */
const askUntilValid = async <T>(
  ask: Ask,
  prompt: string,
  parse: (answer: string) => T
): Promise<T> => {
  for (;;) {
    const answer = await ask(prompt);
    try {
      return parse(answer);
    } catch (error: any) {
      console.log(`  ⚠️  ${error.message}`);
    }
  }
};

export const promptAnswers = async (ask: Ask): Promise<InitAnswersI> => {
  console.log("\nLet's set up a tokens-bruecke config.");
  console.log('Press Enter to accept the default shown with ›.\n');

  console.log('Color mode');
  console.log(renderChoices(COLOR_MODE_CHOICES, 0));
  const colorMode = await askUntilValid(ask, '\n? Color mode [1]: ', (a) =>
    parseChoice(a, COLOR_MODE_CHOICES, defaultAnswers.colorMode)
  );

  console.log('\nStyles to include (variables are always exported)');
  console.log(renderChoices(STYLE_CHOICES));
  const includedStyles = await askUntilValid(
    ask,
    '\n? Include styles, comma separated [none]: ',
    (a) => parseMultiChoice(a, STYLE_CHOICES)
  );

  const useDTCG = await askUntilValid(
    ask,
    '\n? Use DTCG 2025.10 format? (Y/n) [Y]: ',
    (a) => parseYesNo(a, defaultAnswers.useDTCG)
  );

  console.log('\nOutput layout');
  console.log(renderChoices(SPLIT_CHOICES, 0));
  const split = await askUntilValid(ask, '\n? Output layout [1]: ', (a) =>
    parseChoice(a, SPLIT_CHOICES, defaultAnswers.split)
  );

  return { colorMode, includedStyles, useDTCG, split };
};

/**
 * Keyboard-driven variant: arrow keys, space to toggle, enter to confirm.
 * Falls back to promptAnswers() where raw mode is unavailable.
 */
export const promptAnswersInteractive = async (
  io: PromptIoI
): Promise<InitAnswersI> => {
  const colorMode = await select<colorModeType>(
    io,
    'Color mode',
    COLOR_MODE_CHOICES.map(
      (choice): ChoiceI<colorModeType> => ({
        value: choice.value,
        label: choice.name,
        hint: choice.example,
      })
    ),
    0
  );

  const includedStyles = await multiselect<stylesType>(
    io,
    'Styles to include',
    STYLE_CHOICES.map(
      (choice): ChoiceI<stylesType> => ({
        value: choice.value,
        label: choice.label,
      })
    )
  );

  const useDTCG = await confirm(io, 'Use DTCG 2025.10 format?', true);

  const split = await select<InitAnswersI['split']>(
    io,
    'Output layout',
    SPLIT_CHOICES.map(
      (choice): ChoiceI<InitAnswersI['split']> => ({
        value: choice.value,
        label: choice.label,
      })
    ),
    0
  );

  return { colorMode, includedStyles, useDTCG, split };
};

const nextSteps = (configPath: string, split: InitAnswersI['split']) => {
  const outFlag = split === 'none' ? '-o tokens.json' : '-o ./tokens';
  return [
    '',
    'Next steps:',
    '',
    '  # Export via the Figma REST API (needs a token and an Enterprise plan)',
    `  tokens-bruecke -f <FILE_KEY> -c ${configPath} ${outFlag}`,
    '',
    '  # Or from a local snapshot — no token, no Enterprise plan',
    `  tokens-bruecke --input snapshot.json -c ${configPath} ${outFlag}`,
    '',
    'Open the config in your editor: the $schema link documents every option,',
    'including the ones this prompt did not ask about.',
  ].join('\n');
};

export interface RunInitOptionsI {
  path?: string;
  yes?: boolean;
  force?: boolean;
  ask?: Ask;
  isTTY?: boolean;
}

export const runInit = async ({
  path = DEFAULT_CONFIG_FILENAME,
  yes = false,
  force = false,
  ask,
  isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY),
}: RunInitOptionsI): Promise<void> => {
  const target = resolve(process.cwd(), path);

  if (existsSync(target) && !force) {
    console.error(`🔴 ${path} already exists. Pass --force to overwrite it.`);
    process.exit(1);
  }

  let answers = defaultAnswers;

  if (!yes && ask) {
    answers = await promptAnswers(ask);
  } else if (!yes && isTTY && supportsRawMode(process.stdin)) {
    console.log("\nLet's set up a tokens-bruecke config.\n");
    try {
      answers = await promptAnswersInteractive({
        input: process.stdin,
        output: process.stdout,
        color: !process.env.NO_COLOR,
      });
    } catch (error) {
      if (error instanceof PromptCancelledError) {
        console.log('\nCancelled — no config written.');
        process.exit(130);
      }
      throw error;
    }
  } else if (!yes && isTTY) {
    const readline = await import('node:readline/promises');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    // Ctrl+C and Ctrl+D are a normal way to back out, not a crash
    rl.on('SIGINT', () => {
      rl.close();
      console.log('\n\nCancelled — no config written.');
      process.exit(130);
    });
    try {
      answers = await promptAnswers((q: string) => rl.question(q));
    } catch {
      console.log('\n\nCancelled — no config written.');
      process.exit(130);
    } finally {
      rl.close();
    }
  } else if (!yes) {
    // Never block waiting for input that cannot arrive (CI, pipes, agents)
    console.error(
      'ℹ️  Not a terminal — writing the default config without prompting.'
    );
  }

  const config = buildConfig(answers);

  try {
    // Match the export path, which creates missing output directories
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  } catch (error: any) {
    console.error(`🔴 Could not write ${path}:`, error?.message ?? error);
    process.exit(1);
  }

  console.log(`\n✨ Created ${path}`);
  console.log(nextSteps(path, answers.split));
};
