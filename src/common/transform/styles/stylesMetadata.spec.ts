import { describe, expect, it } from 'vitest';
import { stylesToTokens } from './stylesToTokens';

const resolver = {
  getLocalTextStyles: async () => [
    {
      id: 'text-id',
      name: 'text',
      description: '',
      fontName: { family: 'Inter', style: 'Regular' },
      fontSize: 16,
      lineHeight: { unit: 'AUTO' },
      letterSpacing: { unit: 'PIXELS', value: 0 },
      paragraphSpacing: 0,
      paragraphIndent: 0,
    },
  ],
  getLocalGridStyles: async () => [
    { id: 'grid-id', name: 'grid', layoutGrids: [] },
  ],
  getLocalEffectStyles: async () => [
    {
      id: 'shadow-id',
      name: 'shadow',
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 1 },
          offset: { x: 0, y: 0 },
          radius: 4,
        },
      ],
    },
    {
      id: 'blur-id',
      name: 'blur',
      effects: [{ type: 'LAYER_BLUR', radius: 4 }],
    },
  ],
  getLocalPaintStyles: async () => [
    {
      id: 'color-id',
      name: 'color',
      paints: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
    },
    {
      id: 'gradient-id',
      name: 'gradient',
      paints: [
        {
          type: 'GRADIENT_RADIAL',
          gradientStops: [{ position: 0, color: { r: 0, g: 0, b: 0, a: 1 } }],
        },
      ],
    },
  ],
} as any;

const settings = {
  includedStyles: Object.fromEntries(
    ['text', 'grids', 'effects', 'colors'].map((name) => [
      name,
      { isIncluded: true, customName: name },
    ])
  ),
  colorMode: 'hex',
  useDTCG: true,
  includeValueStringKeyToAlias: false,
} as any;

describe('style metadata', () => {
  it.each([false, true])(
    'exports style IDs with metadata setting %s',
    async (enabled) => {
      const [text, grids, effects, colors] = (await stylesToTokens(
        { ...settings, includeFigmaMetaData: enabled },
        resolver
      )) as any[];
      for (const [token, id] of [
        [text.text.text, 'text-id'],
        [grids.grids.grid, 'grid-id'],
        [effects.effects.shadow, 'shadow-id'],
        [effects.effects.blur, 'blur-id'],
        [colors.colors.color, 'color-id'],
        [colors.colors.gradient, 'gradient-id'],
      ]) {
        expect(token.$extensions?.figma).toEqual(
          enabled ? { styleId: id } : undefined
        );
      }
      expect(text.text.text.$extensions.styleId).toBe('text-id');
      expect(colors.colors.gradient.$extensions.gradient).toEqual({
        type: 'radial',
      });
    }
  );
});
