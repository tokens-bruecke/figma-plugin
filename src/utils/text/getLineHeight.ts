export const getLineHeight = (lineHeight: LineHeight) => {
  if (lineHeight.unit === "PIXELS") {
    return `${lineHeight.value}px`;
  }

  if (lineHeight.unit === "PERCENT") {
    return `${lineHeight.value}%`;
  }

  if (lineHeight.unit === "AUTO") {
    return "auto";
  }

  return lineHeight;
};
