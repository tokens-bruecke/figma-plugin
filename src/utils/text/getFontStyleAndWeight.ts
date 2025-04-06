export function getFontStyleAndWeight(fontStyle: string) {
  const formattedStyleParts = fontStyle
    .toLowerCase()
    .split(" ")
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

  const resolvedWeight =
    Object.keys(weights).find((weight) =>
      weights[weight].some((value) => formattedStyleParts.includes(value))
    ) || 400;
  const resolvedStyle =
    styles.find((style) => formattedStyleParts.includes(style)) || "normal";
  return {
    weight: Number(resolvedWeight),
    style: resolvedStyle,
  };
}
