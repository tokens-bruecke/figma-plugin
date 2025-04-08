import { convertRGBA } from "./convertRGBA";

////////////////////////////////
////////////////////////////////
// WORKIN VERSION BUT NOT SO GUT
// original verison from https://github.com/jiangyijie27/figma-copy-css-and-react-style/blob/master/code.ts
interface IGradientTransformData {
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
}

export const convertFigmaLinearGradient = (paint: Paint) => {
  if (!paint || paint.visible === false) {
    return "";
  }

  const { type } = paint;

  const { gradientTransform, gradientStops } = paint as GradientPaint;
  if (!gradientTransform || !gradientStops) {
    return "";
  }
  let gradientTransformData: IGradientTransformData = {
    m00: 1,
    m01: 0,
    m02: 0,
    m10: 0,
    m11: 1,
    m12: 0,
  };
  const delta =
    gradientTransform[0][0] * gradientTransform[1][1] -
    gradientTransform[0][1] * gradientTransform[1][0];
  if (delta !== 0) {
    const deltaVal = 1 / delta;
    gradientTransformData = {
      m00: gradientTransform[1][1] * deltaVal,
      m01: -gradientTransform[0][1] * deltaVal,
      m02:
        (gradientTransform[0][1] * gradientTransform[1][2] -
          gradientTransform[1][1] * gradientTransform[0][2]) *
        deltaVal,
      m10: -gradientTransform[1][0] * deltaVal,
      m11: gradientTransform[0][0] * deltaVal,
      m12:
        (gradientTransform[1][0] * gradientTransform[0][2] -
          gradientTransform[0][0] * gradientTransform[1][2]) *
        deltaVal,
    };
  }
  const rotationTruthy =
    gradientTransformData.m00 * gradientTransformData.m11 -
      gradientTransformData.m01 * gradientTransformData.m10 >
    0
      ? 1
      : -1;
  let rotationData = ((
    data: IGradientTransformData,
    param: { x: number; y: number }
  ) => ({
    x: data.m00 * param.x + data.m01 * param.y,
    y: data.m10 * param.x + data.m11 * param.y,
  }))(gradientTransformData, { x: 0, y: 1 });

  const gradientRotation = (
    (Math.atan2(
      rotationData.y * rotationTruthy,
      rotationData.x * rotationTruthy
    ) /
      Math.PI) *
    180
  ).toFixed(2);

  const gradientStopsData = gradientStops.map((stop) => {
    const color = convertRGBA(stop.color, "rgba-css");
    return `${color} ${Math.round(stop.position * 100)}%`;
  });

  if (type === "GRADIENT_LINEAR") {
    return `linear-gradient(${gradientRotation}deg, ${gradientStopsData.join(
      ", "
    )})`;
  }

  if (type === "GRADIENT_RADIAL") {
    return `radial-gradient(${gradientStopsData.join(", ")})`;
  }
};
