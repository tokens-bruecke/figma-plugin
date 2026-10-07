type Point = { x: number; y: number };

const GRADIENT_TYPES = {
  GRADIENT_LINEAR: 'linear',
  GRADIENT_RADIAL: 'radial',
  GRADIENT_ANGULAR: 'angular',
  GRADIENT_DIAMOND: 'diamond',
} as const;

export type GradientType = (typeof GRADIENT_TYPES)[keyof typeof GRADIENT_TYPES];

export interface GradientGeometry {
  type: GradientType;
  /**
   * Direction of a linear gradient in CSS degrees: 0 is to the top, 90 to
   * the right, 180 to the bottom. Left out when the paint has no handles.
   */
  angle?: number;
}

/**
 * The start and end of a linear gradient, in the layer's own space where
 * (0, 0) is the top left and (1, 1) the bottom right.
 *
 * The REST API has them as `gradientHandlePositions`. The plugin API has a
 * `gradientTransform` instead, which maps the layer to the space where the
 * gradient runs from (0, 0.5) to (1, 0.5), so the handles are those two
 * points mapped back.
 */
const getHandles = (paint: any): [Point, Point] | undefined => {
  const handles: Point[] | undefined = paint.gradientHandlePositions;

  if (handles && handles.length >= 2) {
    return [handles[0], handles[1]];
  }

  const transform: number[][] | undefined = paint.gradientTransform;

  if (!transform) {
    return undefined;
  }

  const [[a, b, c], [d, e, f]] = transform;
  const determinant = a * e - b * d;

  if (determinant === 0) {
    return undefined;
  }

  const invert = (x: number, y: number): Point => ({
    x: (e * (x - c) - b * (y - f)) / determinant,
    y: (-d * (x - c) + a * (y - f)) / determinant,
  });

  return [invert(0, 0.5), invert(1, 0.5)];
};

/**
 * The type of a gradient paint, and for a linear one its direction. The stops
 * alone do not tell either.
 */
export const getGradientGeometry = (
  paint: any
): GradientGeometry | undefined => {
  const type = GRADIENT_TYPES[paint.type as keyof typeof GRADIENT_TYPES];

  if (!type) {
    return undefined;
  }

  const handles = type === 'linear' ? getHandles(paint) : undefined;

  if (!handles) {
    return { type };
  }

  const [start, end] = handles;
  const degrees =
    (Math.atan2(end.x - start.x, start.y - end.y) * 180) / Math.PI;

  // Rounded so that handles that differ by float noise give the same angle
  const angle = (Math.round(degrees * 100) / 100 + 360) % 360;

  return { type, angle };
};
