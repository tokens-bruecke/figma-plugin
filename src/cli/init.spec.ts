import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, existsSync, rmSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  COLOR_MODE_CHOICES,
  STYLE_CHOICES,
  SPLIT_CHOICES,
  buildConfig,
  defaultAnswers,
  parseChoice,
  parseMultiChoice,
  parseYesNo,
  promptAnswers,
  runInit,
} from './init';
import { CONFIG_SCHEMA_URL, defaultConfig } from './defaults';

const dirs: string[] = [];
const scratch = () => {
  const dir = mkdtempSync(join(tmpdir(), 'tb-init-'));
  dirs.push(dir);
  return dir;
};

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** Feeds scripted answers to promptAnswers/runInit in order. */
const scriptedAsk = (answers: string[]) => {
  let i = 0;
  return async () => answers[i++] ?? '';
};

describe('parseChoice', () => {
  it('keeps the default on an empty answer', () => {
    expect(parseChoice('', COLOR_MODE_CHOICES, 'hex')).toBe('hex');
    expect(parseChoice('   ', COLOR_MODE_CHOICES, 'hex')).toBe('hex');
  });

  it('resolves a 1-based index', () => {
    expect(parseChoice('8', COLOR_MODE_CHOICES, 'hex')).toBe('oklch-dtcg');
  });

  it('rejects out-of-range and non-numeric answers', () => {
    expect(() => parseChoice('0', COLOR_MODE_CHOICES, 'hex')).toThrow(
      /1 and 8/
    );
    expect(() => parseChoice('9', COLOR_MODE_CHOICES, 'hex')).toThrow(
      /1 and 8/
    );
    expect(() => parseChoice('hex', COLOR_MODE_CHOICES, 'hex')).toThrow(
      /1 and 8/
    );
    expect(() => parseChoice('1.5', COLOR_MODE_CHOICES, 'hex')).toThrow(
      /1 and 8/
    );
  });
});

describe('parseMultiChoice', () => {
  it('treats an empty answer as none', () => {
    expect(parseMultiChoice('', STYLE_CHOICES)).toEqual([]);
  });

  it('accepts comma and space separated numbers', () => {
    expect(parseMultiChoice('1, 3', STYLE_CHOICES)).toEqual([
      'colors',
      'effects',
    ]);
    expect(parseMultiChoice('2 4', STYLE_CHOICES)).toEqual(['text', 'grids']);
  });

  it('de-duplicates repeats', () => {
    expect(parseMultiChoice('1,1,1', STYLE_CHOICES)).toEqual(['colors']);
  });

  it('names the offending entry', () => {
    expect(() => parseMultiChoice('1,7', STYLE_CHOICES)).toThrow(
      /"7" is not a choice/
    );
  });
});

describe('parseYesNo', () => {
  it('maps the usual spellings', () => {
    expect(parseYesNo('y', false)).toBe(true);
    expect(parseYesNo('YES', false)).toBe(true);
    expect(parseYesNo('n', true)).toBe(false);
    expect(parseYesNo('No', true)).toBe(false);
  });

  it('keeps the default when empty and rejects anything else', () => {
    expect(parseYesNo('', true)).toBe(true);
    expect(() => parseYesNo('maybe', true)).toThrow(/y or n/);
  });
});

describe('buildConfig', () => {
  it('writes every option, not just the answered ones', () => {
    const config = buildConfig(defaultAnswers);
    for (const key of Object.keys(defaultConfig)) {
      expect(config).toHaveProperty(key);
    }
    expect(config.$schema).toBe(CONFIG_SCHEMA_URL);
    expect(config).not.toHaveProperty('useDTCGKeys');
  });

  it('applies the answers', () => {
    const config = buildConfig({
      colorMode: 'oklch-dtcg',
      includedStyles: ['colors', 'text'],
      useDTCG: false,
      split: 'mode',
    });

    expect(config.colorMode).toBe('oklch-dtcg');
    expect(config.useDTCG).toBe(false);
    expect(config.includedStyles.colors.isIncluded).toBe(true);
    expect(config.includedStyles.text.isIncluded).toBe(true);
    expect(config.includedStyles.effects.isIncluded).toBe(false);
    expect(config.splitByMode).toBe(true);
    expect(config.splitByCollection).toBe(false);
  });

  it('keeps the default style group names', () => {
    const config = buildConfig(defaultAnswers);
    expect(config.includedStyles.text.customName).toBe('Typography-styles');
  });

  it('maps the collection split independently', () => {
    const config = buildConfig({ ...defaultAnswers, split: 'collection' });
    expect(config.splitByCollection).toBe(true);
    expect(config.splitByMode).toBe(false);
  });
});

describe('promptAnswers', () => {
  it('accepts all defaults when every answer is empty', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const answers = await promptAnswers(scriptedAsk(['', '', '', '']));
    expect(answers).toEqual(defaultAnswers);
  });

  it('collects the answers in order', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const answers = await promptAnswers(scriptedAsk(['8', '1,3', 'n', '3']));
    expect(answers).toEqual({
      colorMode: 'oklch-dtcg',
      includedStyles: ['colors', 'effects'],
      useDTCG: false,
      split: 'mode',
    });
  });

  it('re-asks after a bad answer instead of giving up', async () => {
    const logged: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logged.push(args.join(' '));
    });
    const answers = await promptAnswers(scriptedAsk(['99', '2', '', '', '']));
    expect(answers.colorMode).toBe(COLOR_MODE_CHOICES[1].value);
    expect(logged.some((line) => line.includes('⚠️'))).toBe(true);
  });
});

describe('runInit', () => {
  it('writes a config the export path can consume', async () => {
    const dir = scratch();
    const path = join(dir, 'tokens-bruecke.config.json');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await runInit({ path, yes: true, isTTY: false });

    const written = JSON.parse(readFileSync(path, 'utf-8'));
    expect(written.$schema).toBe(CONFIG_SCHEMA_URL);
    expect(written.colorMode).toBe('hex');
    expect(written.useDTCG).toBe(true);
  });

  it('does not prompt when stdin is not a terminal', async () => {
    const dir = scratch();
    const path = join(dir, 'c.json');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});

    await runInit({ path, isTTY: false });

    expect(existsSync(path)).toBe(true);
    expect(warn.mock.calls.flat().join(' ')).toMatch(/Not a terminal/);
  });

  it('refuses to clobber an existing config without --force', async () => {
    const dir = scratch();
    const path = join(dir, 'c.json');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await runInit({ path, yes: true, isTTY: false });

    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exited');
    }) as any);

    await expect(runInit({ path, yes: true, isTTY: false })).rejects.toThrow(
      'exited'
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('overwrites with --force', async () => {
    const dir = scratch();
    const path = join(dir, 'c.json');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await runInit({ path, yes: true, isTTY: false });
    await runInit({
      path,
      force: true,
      isTTY: false,
      ask: scriptedAsk(['8', '', '', '']),
    });

    expect(JSON.parse(readFileSync(path, 'utf-8')).colorMode).toBe(
      'oklch-dtcg'
    );
  });
});

describe('choice lists', () => {
  it('offers every colorMode the exporter supports', () => {
    expect(COLOR_MODE_CHOICES.map((c) => c.value)).toEqual([
      'hex',
      'rgba-css',
      'rgba-object',
      'srgb-dtcg',
      'hsla-css',
      'hsla-object',
      'hsl-dtcg',
      'oklch-dtcg',
    ]);
  });

  it('offers every style group', () => {
    expect(STYLE_CHOICES.map((c) => c.value).sort()).toEqual([
      'colors',
      'effects',
      'grids',
      'text',
    ]);
    expect(SPLIT_CHOICES).toHaveLength(3);
  });
});
