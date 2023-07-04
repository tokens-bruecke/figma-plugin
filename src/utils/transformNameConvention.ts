export const transformNameConvention = (
  name: string,
  nameConvention: nameConventionType
) => {
  switch (nameConvention) {
    case "none":
      return name;
    case "PascalCase":
      return name
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("");
    case "camelCase":
      return name
        .split("-")
        .map((word, index) =>
          index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join("");
    case "snake_case":
      return name.split("-").join("_");
    case "kebab-case":
      return name;
    case "UPPERCASE":
      return name.toUpperCase();
    case "lowercase":
      return name.toLowerCase();
    default:
      return name;
  }
};
