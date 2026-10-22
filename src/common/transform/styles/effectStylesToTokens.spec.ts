import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { effectStylesToTokens } from './effectStylesToTokens';

const exportShadow = async (effect: Record<string, any>) => {
  const resolver = {
    getLocalEffectStyles: async () => [
      { id: '1:2', name: 'shadow', effects: [effect] },
    ],
  } as any;

  const tokens: any = await effectStylesToTokens(
    'effects',
    'hex',
    true,
    false,
    resolver
  );

  return tokens.effects.shadow.$value[0];
};

describe('effectStylesToTokens', () => {
  it('uses a spread of 0 when the REST API leaves it out', async () => {
    const shadow = await exportShadow({
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.24 },
      offset: { x: 0, y: 2 },
      radius: 4,
    });

    expect(shadow.spread).toEqual({ value: 0, unit: 'px' });
  });

  it('keeps the spread when there is one', async () => {
    const shadow = await exportShadow({
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.24 },
      offset: { x: 0, y: 2 },
      radius: 4,
      spread: 3,
    });

    expect(shadow.spread).toEqual({ value: 3, unit: 'px' });
  });
});

describe('effect styles the plugin cannot fully export', () => {
  const shadow = {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.5 },
    offset: { x: 0, y: 2 },
    radius: 4,
    spread: 0,
  };
  const blur = { type: 'LAYER_BLUR', radius: 8 };

  const exportStyles = async (styles: Record<string, any>[]) => {
    const resolver = {
      getLocalEffectStyles: async () => styles,
    } as any;

    const tokens: any = await effectStylesToTokens(
      'effects',
      'hex',
      true,
      false,
      resolver
    );

    return tokens.effects;
  };

  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('exports only the shadows of a style that also has a blur', async () => {
    const effects = await exportStyles([
      { id: '1:2', name: 'mixed', effects: [shadow, blur] },
    ]);

    expect(effects.mixed.$type).toBe('shadow');
    expect(effects.mixed.$value).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[tokens-bruecke] Style "mixed": left out 1')
    );
  });

  it('exports a blur when the blur comes first', async () => {
    const effects = await exportStyles([
      { id: '1:2', name: 'mixed', effects: [blur, shadow] },
    ]);

    expect(effects.mixed).toEqual({
      $type: 'blur',
      $value: { role: 'layer', blur: { value: 8, unit: 'px' } },
    });
  });

  it('skips a style without effects and keeps exporting the others', async () => {
    const effects = await exportStyles([
      { id: '1:2', name: 'empty', effects: [] },
      { id: '1:3', name: 'shadow', effects: [shadow] },
    ]);

    expect(effects.empty).toBeUndefined();
    expect(effects.shadow.$type).toBe('shadow');
    expect(warn).toHaveBeenCalledWith(
      '[tokens-bruecke] Skipped style "empty": it has no effects'
    );
  });

  it('skips a style whose first effect is not a shadow or a blur', async () => {
    const effects = await exportStyles([
      { id: '1:2', name: 'noise', effects: [{ type: 'NOISE' }] },
    ]);

    expect(effects.noise).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      '[tokens-bruecke] Skipped style "noise": unsupported effect type NOISE'
    );
  });
});

describe('blur styles', () => {
  const exportBlur = async (isDTCGFormat: boolean) => {
    const resolver = {
      getLocalEffectStyles: async () => [
        {
          id: '1:2',
          name: 'blur',
          effects: [{ type: 'BACKGROUND_BLUR', radius: 4 }],
        },
      ],
    } as any;

    const tokens: any = await effectStylesToTokens(
      'effects',
      'hex',
      isDTCGFormat,
      false,
      resolver
    );

    return tokens.effects.blur;
  };

  it('uses the $-prefixed keys in the DTCG format', async () => {
    expect(await exportBlur(true)).toEqual({
      $type: 'blur',
      $value: { role: 'background', blur: { value: 4, unit: 'px' } },
    });
  });

  it('uses the plain keys without the DTCG format, like other tokens', async () => {
    expect(await exportBlur(false)).toEqual({
      type: 'blur',
      value: { role: 'background', blur: '4px' },
    });
  });
});
