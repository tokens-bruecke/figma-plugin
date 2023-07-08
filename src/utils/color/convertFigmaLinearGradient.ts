import { convertRGBA } from "./convertRGBA";

////////////////////////////////////
////////////////////////////////////
// // WORKING VERSION BUT NOT SO GUT
// // original verison from https://github.com/bernaferrari/FigmaToCode/blob/4fd675a3db9f03752e79802a0cf0277796bb77c8/src/common/color.ts
// // from https://math.stackexchange.com/a/2888105
// export const decomposeRelativeTransform = (
//   t1: [number, number, number],
//   t2: [number, number, number]
// ): {
//   translation: [number, number];
//   rotation: number;
//   scale: [number, number];
//   skew: [number, number];
// } => {
//   const a: number = t1[0];
//   const b: number = t1[1];
//   const c: number = t1[2];
//   const d: number = t2[0];
//   const e: number = t2[1];
//   const f: number = t2[2];

//   const delta = a * d - b * c;

//   const result: {
//     translation: [number, number];
//     rotation: number;
//     scale: [number, number];
//     skew: [number, number];
//   } = {
//     translation: [e, f],
//     rotation: 0,
//     scale: [0, 0],
//     skew: [0, 0],
//   };

//   // Apply the QR-like decomposition.
//   if (a !== 0 || b !== 0) {
//     const r = Math.sqrt(a * a + b * b);
//     result.rotation = b > 0 ? Math.acos(a / r) : -Math.acos(a / r);
//     result.scale = [r, delta / r];
//     result.skew = [Math.atan((a * c + b * d) / (r * r)), 0];
//   }

//   return result;
// };

// export const retrieveTopFill = (
//   fills: ReadonlyArray<Paint> | PluginAPI["mixed"]
// ): Paint | undefined => {
//   if (fills && fills !== figma.mixed && fills.length > 0) {
//     // on Figma, the top layer is always at the last position
//     // reverse, then try to find the first layer that is visible, if any.
//     return [...fills].reverse().find((d) => d.visible !== false);
//   }
// };

// const gradientAngle = (fill: GradientPaint): number => {
//   // Thanks Gleb and Liam for helping!
//   const decomposed = decomposeRelativeTransform(
//     fill.gradientTransform[0],
//     fill.gradientTransform[1]
//   );

//   return (decomposed.rotation * 180) / Math.PI;
// };

// export const htmlColor = (color: RGB, alpha: number = 1): string => {
//   const r = Math.round(color.r * 255);
//   const g = Math.round(color.g * 255);
//   const b = Math.round(color.b * 255);
//   const a = alpha;

//   if (color.r === 1 && color.g === 1 && color.b === 1 && alpha === 1) {
//     return "white";
//   }

//   if (color.r === 0 && color.g === 0 && color.b === 0 && alpha === 1) {
//     return "black";
//   }

//   return `rgba(${r}, ${g}, ${b}, ${a})`;
// };

// export const convertFigmaLinearGradient = (fill: GradientPaint): string => {
//   // add 90 to be correct in HTML.
//   const angle = (gradientAngle(fill) + 90).toFixed(0);

//   const mappedFill = fill.gradientStops
//     .map((d) => {
//       // only add position to fractional
//       const position =
//         d.position > 0 && d.position < 1
//           ? " " + (100 * d.position).toFixed(0) + "%"
//           : "";

//       return `${htmlColor(d.color, d.color.a)}${position}`;
//     })
//     .join(", ");

//   const gradient = `linear-gradient(${angle}deg, ${mappedFill})`;
//   console.log("gradient", gradient);

//   return gradient;
// };

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
