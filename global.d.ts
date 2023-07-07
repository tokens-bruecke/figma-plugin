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

type colorModeType =
  | "hex"
  | "rgba-object"
  | "rgba-css"
  | "hsla-object"
  | "hsla-css";

type stylesType = "text" | "colors" | "effects" | "grids";

type variableFeatureType = "scope" | "hidden";

type JSONSettingsStyleType = {
  isIncluded: boolean;
  customName: string;
  collectionId: string | null;
};

interface IncludedStylesI {
  colors: JSONSettingsStyleType;
  text: JSONSettingsStyleType;
  effects: JSONSettingsStyleType;
  grids: JSONSettingsStyleType;
}

interface JSONSettingsConfigI {
  namesTransform: nameConventionType;
  includeStyles: IncludedStylesI;
  includeScopes: boolean;
  splitFiles: boolean;
  colorMode: colorModeType;
}
