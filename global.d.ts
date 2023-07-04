type nameConventionType =
  | "none"
  | "PascalCase"
  | "camelCase"
  | "snake_case"
  | "kebab-case"
  | "UPPERCASE"
  | "lowercase";

type stylesType = "text" | "color" | "effects" | "grids";

type variableFeatureType = "scope" | "hidden";

interface JSONSettingsConfigI {
  namesTransform: nameConventionType;
  includeStyles: stylesType[];
  includeScopes: boolean;
  splitFiles: boolean;
}
