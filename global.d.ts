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
  colors: JSONSettingsStyleType;
  text: JSONSettingsStyleType;
  effects: JSONSettingsStyleType;
  grids: JSONSettingsStyleType;
}

interface JsonbinCredentialsI {
  isEnabled: boolean;
  id?: string;
  name: string;
  secretKey: string;
}

interface GithubCredentialsI {
  isEnabled: boolean;
  token: string;
  repo: string;
  branch: string;
  fileName: string;
  owner: string;
  commitMessage?: string;
}

interface GithubPullRequestCredentialsI {
  isEnabled: boolean;
  token: string;
  repo: string;
  baseBranch: string;
  branch: string;
  fileName: string;
  owner: string;
  commitMessage?: string;
  pullRequestTitle?: string;
  pullRequestBody?: string;
}

interface GitlabCredentialsI {
  isEnabled: boolean;
  owner: string;
  repo: string;
  branch: string;
  fileName: string;
  token: string;
  commitMessage?: string;
}

interface CustomURLCredentialsI {
  isEnabled: boolean;
  url: string;
  method: "POST" | "PUT";
  headers: string;
}

interface JSONSettingsConfigI {
  includedStyles: IncludedStylesI;
  includeScopes: boolean;
  useDTCGKeys: boolean;
  includeValueAliasString: boolean;
  colorMode: colorModeType;
  variableCollections: string[];
  selectedCollection: string;
  servers: {
    jsonbin: JsonbinCredentialsI;
    github: GithubCredentialsI;
    githubPullRequest: GithubPullRequestCredentialsI;
    gitlab: GitlabCredentialsI;
    customURL: CustomURLCredentialsI;
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
  | "githubPullRequest"
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
      readonly type: "input" | "textarea" | "select";
      readonly required: boolean;
      readonly placeholder?: string;
      readonly options?: string[];
      value: string;
    }[];
  };
};

interface TokensMessageI {
  type: "getTokens" | "setTokens";
  tokens: any;
  role: "preview" | "push" | "download";
  server: ServerType[];
}

interface MetaPropsI {
  useDTCGKeys: boolean;
  colorMode: colorModeType;
  variableCollections: string[];
  createdAt: string;
}

interface ToastIPropsI {
  title: string;
  message: string;
  options: {
    type?: "success" | "error" | "warn" | "info";
    timeout?: number;
    onClose?: () => void;
  };
}

// Extend Figmas PaintStyle interface
interface PaintStyleExtended extends PaintStyle {
  readonly boundVariables?: {
    readonly paints: VariableAlias[];
  };
}
