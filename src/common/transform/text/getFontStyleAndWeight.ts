export function getFontStyleAndWeight(fontStyle: string) {
  // Split on spaces or hyphens, then clean each part
  const formattedStyleParts = fontStyle
    .toLowerCase()
    .split(/[\s-]+/) // Split on spaces or hyphens
    .map((s) => s.replaceAll(/[-_.]/gi, ""));

  const weights = {
    100: ["thin", "hairline", "100"],
    200: ["extralight", "ultralight", "200"],
    300: ["light", "300"],
    400: ["normal", "regular", "book", "400"],
    500: ["medium", "500"],
    600: ["semibold", "demibold", "600"],
    700: ["bold", "700"],
    800: ["ultrabold", "extrabold", "800"],
    900: ["black", "heavy", "900"],
    950: ["extrablack", "ultrablack", "950"],
  };
  const styles = ["italic", "oblique", "normal"];

  // Detect and remove style
  let resolvedStyle = "normal";
  const styleIndex = formattedStyleParts.findIndex((part) =>
    styles.includes(part)
  );
  if (styleIndex !== -1) {
    resolvedStyle = formattedStyleParts[styleIndex];
    formattedStyleParts.splice(styleIndex, 1); // Remove style from parts
  }

  // Process remaining parts for weight
  const weightParts = formattedStyleParts; // What's left after style removal
  const joinedWeight = weightParts.join(""); // Join remaining parts for compound weights

  const resolvedWeight =
    Object.keys(weights).find((weight) => {
      return (
        weights[weight].some((value) => weightParts.includes(value)) ||
        weights[weight].includes(joinedWeight)
      );
    }) || 400;

  return {
    weight: Number(resolvedWeight),
    style: resolvedStyle,
  };
}
