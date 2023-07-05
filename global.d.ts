type nameConventionType =
  | "none"
  | "PascalCase"
  | "camelCase"
  | "snake_case"
  | "kebab-case"
  | "UPPERCASE"
  | "lowercase"
  | "MACRO_CASE"
  | "COBOL-CASE"
  | "Cobol case"
  | "Ada_Case"
  | "dot.notation";

type stylesType = "text" | "effects" | "grids";

type variableFeatureType = "scope" | "hidden";

interface JSONSettingsConfigI {
  namesTransform: nameConventionType;
  includeStyles: {
    type: stylesType;
    name: string;
    collection: string;
  }[];
  includeScopes: boolean;
  splitFiles: boolean;
}
