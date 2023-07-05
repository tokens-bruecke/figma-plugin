export const transformNameConvention = (
  inputString: string,
  targetConvention: nameConventionType
) => {
  switch (targetConvention) {
    case "PascalCase":
      return inputString
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (match) {
          return match.toUpperCase();
        })
        .replace(/\s+|-|_/g, "");

    case "camelCase":
      return inputString
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (match, index) {
          return index === 0 ? match.toLowerCase() : match.toUpperCase();
        })
        .replace(/\s+|-|_/g, "");

    case "snake_case":
      return inputString.replace(/\s+|-/g, "_").toLowerCase();

    case "kebab-case":
      return inputString.replace(/\s+|_/g, "-").toLowerCase();

    case "COBOL-CASE":
      return inputString.replace(/\s+|-|_/g, "-").toUpperCase();

    case "MACRO_CASE":
      return inputString.replace(/\s+|-|_/g, " ").toUpperCase();

    case "Ada_Case":
      return inputString.replace(/\s+|-|_/g, "_").toLowerCase();

    case "UPPERCASE":
      return inputString.toUpperCase();

    case "lowercase":
      return inputString.toLowerCase();

    case "dot.notation":
      return inputString.replace(/\s+|-|_/g, ".");

    default:
      return inputString;
  }
};
