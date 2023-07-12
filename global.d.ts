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
};

interface IncludedStylesI {
  text: JSONSettingsStyleType;
  effects: JSONSettingsStyleType;
  grids: JSONSettingsStyleType;
}

interface JsonbinCredentialsI {
  isEnabled: boolean;
  id?: string;
  name?: string;
  secretKey?: string;
}

interface JSONSettingsConfigI {
  includeStyles: IncludedStylesI;
  includeScopes: boolean;
  splitFiles: boolean;
  colorMode: colorModeType;
  servers: {
    jsonbin: JsonbinCredentialsI;
    github: {
      isEnabled: boolean;
      repo: string;
      branch: string;
      token: string;
      path: string;
    };
    gitlab: {
      isEnabled: boolean;
      repo: string;
      branch: string;
      token: string;
      path: string;
    };
    bitbucket: {
      isEnabled: boolean;
      repo: string;
      branch: string;
      token: string;
      path: string;
    };
    customURL: {
      isEnabled: boolean;
      repo: string;
      branch: string;
      token: string;
      path: string;
    };
  };
}

interface PluginTokenI {
  $value: string;
  $type: TokenType;
  $description: string;
  scopes?: VariableScope[];
  $extensions: {
    variableId: string;
    aliasPath: string;
  };
}

type ServerType =
  | "jsonbin"
  | "github"
  | "gitlab"
  | "bitbucket"
  | "customURL"
  | "none";

type ViewsConfigI = {
  [K in ServerType]: {
    title: string;
    description: React.ReactNode;
    isEnabled: boolean;
    fields: {
      readonly id: string;
      readonly placeholder: string;
      readonly type: string;
      readonly required: boolean;
      value: string;
    }[];
  };
};

interface TokensMessageI {
  type: "getTokens" | "setTokens";
  tokens: any;
  role: "preview" | "push";
  server: ServerType;
}

// Extend Figmas PaintStyle interface
interface PaintStyleExtended extends PaintStyle {
  readonly boundVariables?: {
    readonly paints: VariableAlias[];
  };
}
