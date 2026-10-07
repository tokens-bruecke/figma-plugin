import { describe, it, expect } from 'vitest';
import { getGradientGeometry } from './getGradientGeometry';

const linear = (extra: Record<string, unknown>) => ({
  type: 'GRADIENT_LINEAR',
  ...extra,
});

describe('getGradientGeometry', () => {
  it('reads the direction from the REST handle positions', () => {
    const toBottom = linear({
      gradientHandlePositions: [
        { x: 0.5000000349455451, y: 4.0366735295322006e-8 },
        { x: 0.5000000112789675, y: 0.9999999211574581 },
        { x: 0.35342779114444844, y: 2.8533443353473004e-8 },
      ],
    });

    expect(getGradientGeometry(toBottom)).toEqual({
      type: 'linear',
      angle: 180,
    });
  });

  it.each([
    ['to the top', [0.5, 1], [0.5, 0], 0],
    ['to the right', [0, 0.5], [1, 0.5], 90],
    ['to the bottom', [0.5, 0], [0.5, 1], 180],
    ['to the left', [1, 0.5], [0, 0.5], 270],
    ['to the bottom right', [0, 0], [1, 1], 135],
  ])('gives the CSS angle of a gradient %s', (_, start, end, angle) => {
    const paint = linear({
      gradientHandlePositions: [
        { x: start[0], y: start[1] },
        { x: end[0], y: end[1] },
        { x: 0, y: 0 },
      ],
    });

    expect(getGradientGeometry(paint)).toEqual({ type: 'linear', angle });
  });

  it('reads the direction from the plugin gradient transform', () => {
    // The identity runs from the left edge to the right edge
    expect(
      getGradientGeometry(
        linear({
          gradientTransform: [
            [1, 0, 0],
            [0, 1, 0],
          ],
        })
      )
    ).toEqual({ type: 'linear', angle: 90 });

    // Maps the top middle to (0, 0.5) and the bottom middle to (1, 0.5)
    expect(
      getGradientGeometry(
        linear({
          gradientTransform: [
            [0, 1, 0],
            [-1, 0, 1],
          ],
        })
      )
    ).toEqual({ type: 'linear', angle: 180 });
  });

  it('gives the same direction from the plugin transform as from the REST handles', () => {
    // Both read from the same top to bottom gradient style in a Figma file
    const fromPlugin = linear({
      gradientTransform: [
        [-8.07335212016369e-8, 1.0000001192092896, 2.3314683517128287e-14],
        [-3.4112870693206787, -8.073349988535483e-8, 2.205643653869629],
      ],
    });
    const fromRest = linear({
      gradientHandlePositions: [
        { x: 0.5000000349455451, y: 4.0366735295322006e-8 },
        { x: 0.5000000112789675, y: 0.9999999211574581 },
        { x: 0.35342779114444844, y: 2.8533443353473004e-8 },
      ],
    });

    expect(getGradientGeometry(fromPlugin)).toEqual({
      type: 'linear',
      angle: 180,
    });
    expect(getGradientGeometry(fromPlugin)).toEqual(
      getGradientGeometry(fromRest)
    );
  });

  it('only gives the type when there are no handles', () => {
    expect(getGradientGeometry(linear({}))).toEqual({ type: 'linear' });
  });

  it('only gives the type of a gradient that is not linear', () => {
    expect(
      getGradientGeometry({
        type: 'GRADIENT_RADIAL',
        gradientHandlePositions: [
          { x: 0.5, y: 0.5 },
          { x: 1, y: 0.5 },
        ],
      })
    ).toEqual({ type: 'radial' });
  });

  it('is undefined for a paint that is not a gradient', () => {
    expect(getGradientGeometry({ type: 'SOLID' })).toBeUndefined();
  });
});
