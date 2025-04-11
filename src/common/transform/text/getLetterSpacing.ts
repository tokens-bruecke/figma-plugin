export const getLetterSpacing = (letterSpacing: LetterSpacing) => {
  if (letterSpacing.unit === "PIXELS") {
    return `${letterSpacing.value}px`;
  }

  if (letterSpacing.unit === "PERCENT") {
    return `${letterSpacing.value}%`;
  }

  return letterSpacing;
};
