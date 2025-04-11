export const normilizeRGBAColor = (rgba: {
  r: number;
  g: number;
  b: number;
  a: number;
}) => {
  const normalizedRGBA = {
    r: Math.round(rgba.r * 255),
    g: Math.round(rgba.g * 255),
    b: Math.round(rgba.b * 255),
    a: Number(rgba.a.toFixed(2)),
  };

  return normalizedRGBA;
};
