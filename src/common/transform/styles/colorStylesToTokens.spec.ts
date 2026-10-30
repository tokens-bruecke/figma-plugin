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
      '[tokens-bruecke] Skipped style "photo": only a solid paint or a gradient can be exported, it has IMAGE'
    );
    expect(warn).toHaveBeenCalledWith(
      '[tokens-bruecke] Skipped style "empty": it has no paints'
    );

    warn.mockRestore();
  });
});

describe('color styles with several paints', () => {
  const black = { r: 0, g: 0, b: 0 };
  const red = { r: 1, g: 0, b: 0 };
  const style = {
    id: '1:2',
    name: 'stack',
    paints: [
      { type: 'SOLID', color: black, opacity: 0.5, blendMode: 'MULTIPLY' },
      {
        type: 'SOLID',
        color: red,
        boundVariables: { color: { id: 'red' } },
      },
      {
        type: 'GRADIENT_RADIAL',
        gradientStops: stops,
        gradientTransform: [
          [1, 0, 0],
          [0, 1, 0],
        ],
        visible: false,
      },
      { type: 'IMAGE', imageHash: 'hash', scaleMode: 'FILL' },
    ],
  };

  const exportStack = async (includeFigmaMetaData: boolean) => {
    const resolver = {
      getLocalPaintStyles: async () => [style],
      getVariableById: async () => ({
        name: 'red',
        variableCollectionId: 'collection',
      }),
      getVariableCollectionById: async () => ({ name: 'colors' }),
    } as any;

    const tokens: any = await colorStylesToTokens(
      'colors',
      'hex',
      true,
      false,
      resolver,
      false,
      false,
      includeFigmaMetaData
    );

    return tokens.colors.stack;
  };

  it('takes the value from the top visible paint and warns about the rest', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await exportStack(false)).toEqual({
      $type: 'color',
      $value: '{colors.red}',
    });
    expect(warn).toHaveBeenCalledWith(
      '[tokens-bruecke] Style "stack": exported its top paint and left out 2 other paint(s). Turn on "Include Figma metadata" to get all of them in $extensions.figma.paints.'
    );

    warn.mockRestore();
  });

  it('exports every paint in $extensions.figma.paints with Figma metadata', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await exportStack(true)).toEqual({
      $type: 'color',
      $value: '{colors.red}',
      $extensions: {
        figma: {
          styleId: '1:2',
          paints: [
            {
              type: 'SOLID',
              visible: true,
              opacity: 0.5,
              blendMode: 'MULTIPLY',
              color: '#000000',
            },
            {
              type: 'SOLID',
              visible: true,
              opacity: 1,
              blendMode: 'NORMAL',
              color: '{colors.red}',
            },
            {
              type: 'GRADIENT_RADIAL',
              visible: false,
              opacity: 1,
              blendMode: 'NORMAL',
              stops: [
                { color: '#00000000', position: 0 },
                { color: '#000000', position: 0.9 },
              ],
              gradient: { type: 'radial' },
              gradientTransform: [
                [1, 0, 0],
                [0, 1, 0],
              ],
            },
            {
              type: 'IMAGE',
              visible: true,
              opacity: 1,
              blendMode: 'NORMAL',
              imageHash: 'hash',
              scaleMode: 'FILL',
            },
          ],
        },
      },
    });
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });

  it('keeps the gradient geometry next to the Figma metadata', async () => {
    const resolver = {
      getLocalPaintStyles: async () => [
        {
          id: '1:3',
          name: 'fade',
          paints: [{ type: 'GRADIENT_RADIAL', gradientStops: stops }],
        },
      ],
    } as any;

    const tokens: any = await colorStylesToTokens(
      'colors',
      'hex',
      true,
      false,
      resolver,
      false,
      false,
      true
    );

    expect(tokens.colors.fade.$extensions.gradient).toEqual({
      type: 'radial',
    });
    expect(tokens.colors.fade.$extensions.figma.paints).toHaveLength(1);
  });
});
