import { describe, it, expect } from 'vitest';
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
