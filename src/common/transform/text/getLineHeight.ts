export const getLineHeight = (lineHeight: LineHeight) => {
  if (lineHeight.unit === "PIXELS") {
    const roundedValue = Math.round(lineHeight.value);
    return `${roundedValue}px`;
  }

  if (lineHeight.unit === "PERCENT") {
    const roundedValue = Math.round(lineHeight.value);
    return `${roundedValue}%`;
  }

  if (lineHeight.unit === "AUTO") {
    return "auto";
  }

  return lineHeight;
};
