import { describe, it, expect } from 'vitest';
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
