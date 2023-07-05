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

type stylesType = "text" | "colors" | "effects" | "grids";

type variableFeatureType = "scope" | "hidden";

interface JSONSettingsConfigI {
  namesTransform: nameConventionType;
  includeStyles: {
    id: stylesType;
    label: string;
    collection: string;
  }[];
  includeScopes: boolean;
  splitFiles: boolean;
}
