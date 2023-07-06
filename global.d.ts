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

type JSONSettingsStyleType = {
  isIncluded: boolean;
  label: string;
  customName: string;
  collection: {
    id: string;
    name: string;
  } | null;
};

interface JSONSettingsConfigI {
  namesTransform: nameConventionType;
  includeStyles: {
    colors: JSONSettingsStyleType;
    text: JSONSettingsStyleType;
    effects: JSONSettingsStyleType;
    grids: JSONSettingsStyleType;
  };
  includeScopes: boolean;
  splitFiles: boolean;
}
