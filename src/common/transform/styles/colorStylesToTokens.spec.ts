import { describe, it, expect, vi } from 'vitest';
import { colorStylesToTokens } from './colorStylesToTokens';

const exportStyle = async (paint: Record<string, any>) => {
  const resolver = {
    getLocalPaintStyles: async () => [
      { id: '1:2', name: 'fade', paints: [paint] },
    ],
  } as any;

  const tokens: any = await colorStylesToTokens(
    'colors',
    'hex',
    true,
    false,
    resolver
  );

  return tokens.colors.fade;
};

const stops = [
  { color: { r: 0, g: 0, b: 0, a: 0 }, position: 0 },
  { color: { r: 0, g: 0, b: 0, a: 1 }, position: 0.9 },
];

describe('colorStylesToTokens gradients', () => {
  it('exports the type and the direction of a linear gradient', async () => {
    const style = await exportStyle({
      type: 'GRADIENT_LINEAR',
      gradientStops: stops,
      gradientHandlePositions: [
        { x: 0.5, y: 0 },
        { x: 0.5, y: 1 },
        { x: 0.3, y: 0 },
      ],
    });

    expect(style.$type).toBe('gradient');
    expect(style.$value).toHaveLength(2);
    expect(style.$extensions).toEqual({
      gradient: { type: 'linear', angle: 180 },
    });
  });

  it('exports only the type of a gradient that is not linear', async () => {
    const style = await exportStyle({
      type: 'GRADIENT_RADIAL',
      gradientStops: stops,
    });

    expect(style.$extensions).toEqual({ gradient: { type: 'radial' } });
  });
});

describe('color styles the plugin cannot export', () => {
  it('skips them with a warning instead of leaving them out silently', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const resolver = {
      getLocalPaintStyles: async () => [
        { id: '1:2', name: 'photo', paints: [{ type: 'IMAGE' }] },
        { id: '1:3', name: 'empty', paints: [] },
        {
          id: '1:4',
          name: 'red',
          paints: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
        },
      ],
    } as any;

    const tokens: any = await colorStylesToTokens(
      'colors',
      'hex',
      true,
      false,
      resolver
    );

    expect(tokens.colors).toEqual({
      red: { $type: 'color', $value: '#ff0000' },
    });
    expect(warn).toHaveBeenCalledWith(
      '[tokens-bruecke] Skipped style "photo": only a single solid paint or a gradient can be exported, it has IMAGE'
    );
    expect(warn).toHaveBeenCalledWith(
      '[tokens-bruecke] Skipped style "empty": it has no paints'
    );

    warn.mockRestore();
  });
});
