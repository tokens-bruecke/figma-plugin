import { normilizeRGBAColor } from "./normilizeRGBAColor";

type rgbaType = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const rgbaToHexA = (rgba: rgbaType) => {
  const { r, g, b, a } = rgba;

  var outParts = [
    r.toString(16),
    g.toString(16),
    b.toString(16),
    Math.round(a * 255)
      .toString(16)
      .substring(0, 2),
  ];

  // if alpha channel is 1, don't include alpha in hex
  if (a === 1) {
    outParts.pop();
  }

  // Pad single-digit output values
  outParts.forEach(function (part, i) {
    if (part.length === 1) {
      outParts[i] = "0" + part;
    }
  });

  return "#" + outParts.join("");
};

const rgbaToCss = (rgba: rgbaType) => {
  const { r, g, b, a } = rgba;

  if (a === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  }

  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const rgbaToHsla = (rgba: rgbaType) => {
  const { r, g, b, a } = rgba;
  const normalizedR = r / 255;
  const normalizedG = g / 255;
  const normalizedB = b / 255;

  const max = Math.max(normalizedR, normalizedG, normalizedB);
  const min = Math.min(normalizedR, normalizedG, normalizedB);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    if (max === normalizedR) {
      h = 60 * (((normalizedG - normalizedB) / delta + 6) % 6);
    } else if (max === normalizedG) {
      h = 60 * ((normalizedB - normalizedR) / delta + 2);
    } else if (max === normalizedB) {
      h = 60 * ((normalizedR - normalizedG) / delta + 4);
    }

    s = delta / (1 - Math.abs(2 * l - 1));
  }

  const hsla = {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: a,
  };

  return hsla;
};

const hslaToCss = (hsla: any) => {
  const { h, s, l, a } = hsla;
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
};

export const convertRGBA = (rgba: rgbaType, colorFormat: colorModeType) => {
  const normalizedRGBA = normilizeRGBAColor(rgba);

  switch (colorFormat) {
    case "hex":
      return rgbaToHexA(normalizedRGBA);
    case "rgba-css":
      return rgbaToCss(normalizedRGBA);
    case "rgba-object":
      return normalizedRGBA;
    case "hsla-css":
      return hslaToCss(rgbaToHsla(normalizedRGBA));
    case "hsla-object":
      return rgbaToHsla(normalizedRGBA);
  }
};
