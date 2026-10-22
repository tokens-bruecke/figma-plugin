/// <reference path="./node_modules/@figma/plugin-typings/index.d.ts" />

type colorModeType =
  | 'hex'
  | 'rgba-object'
  | 'rgba-css'
  | 'srgb-dtcg'
  | 'hsla-object'
  | 'hsla-css'
  | 'hsl-dtcg'
  | 'oklch-dtcg';

type stylesType = 'text' | 'colors' | 'effects' | 'grids';

type JSONSettingsStyleType = {
  isIncluded: boolean;
  customName: string;
};

interface IncludedStylesI {
  text: JSONSettingsStyleType;
  effects: JSONSettingsStyleType;
  grids: JSONSettingsStyleType;
  colors: JSONSettingsStyleType;
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
  host: string;
  repo: string;
  branch: string;
  fileName: string;
  token: string;
  commitMessage?: string;
}

interface CustomURLCredentialsI {
  isEnabled: boolean;
  url: string;
  method: 'POST' | 'PUT';
  headers: string;
}

interface ExportSettingsI {
  includedStyles: IncludedStylesI;
  includeScopes: boolean;
  useDTCG: boolean;
  includeValueStringKeyToAlias: boolean;
  colorMode: colorModeType;
  storeStyleInCollection: string;
  includeFigmaMetaData: boolean;
  usePercentageOpacity: boolean;
  expandEasingPresets: boolean;
  splitByCollection: boolean;
  splitByMode: boolean;
  omitCollectionNames: boolean;
  omitCreatedAt?: boolean;
}

interface ServerSettingsI {
  jsonbin: JsonbinCredentialsI;
  github: GithubCredentialsI;
  githubPullRequest: GithubPullRequestCredentialsI;
  gitlab: GitlabCredentialsI;
  customURL: CustomURLCredentialsI;
}
type PluginStateI = {
  variableCollections: string[];
};

type JSONSettingsConfigI = ExportSettingsI &
  PluginStateI & {
    servers: ServerSettingsI;
  };

type ProfileId = string;

type SettingsProfileI = JSONSettingsConfigI & {
  profileName: string;
  updatedAt: number;
};

type MultiTenantConfigI = {
  activeProfileId: ProfileId;
  profiles: Record<ProfileId, SettingsProfileI>;
};

interface PluginTokenI {
  $value: string;
  $type?: TokenType;
  $description: string;
  scopes?: VariableScope[];
  $extensions: {
    mode: Object;
    // Marks easings exported as strings, so the import recreates an EASING
    // variable. Older exports also used it for string, boolean and
    // percentage-opacity tokens; the import still reads those.
    figmaType?: VariableResolvedDataType;
    figma?: {
      variableId: string;
      codeSyntax: {
        WEB?: string;
        iOS?: string;
        ANDROID?: string;
      };
      collection: {
        id: string;
        name: string;
        defaultModeId: string;
      };
    };
  };
}

type ServerType = keyof ServerSettingsI;

interface TokensMessageI {
  type:
    | 'getTokens'
    | 'setTokens'
    | 'tokensError'
    | 'importTokens'
    | 'importResult';
  tokens: any;
  role: 'preview' | 'push' | 'download' | 'import';
  server: ServerType[];
  /** Why the export failed, with `tokensError` */
  message?: string;
  result?: {
    success: boolean;
    message: string;
    collectionsCreated: number;
    composedColorsRejected?: number;
    variablesCreated: number;
    errors: string[];
  };
}

interface MetaPropsI {
  useDTCG: boolean;
  spec?: string;
  colorMode: colorModeType;
  variableCollections: string[] | undefined;
  createdAt?: string;
}

interface ToastIPropsI {
  title: string;
  message: string;
  link?: {
    label: string;
    url: string;
  };
  options: {
    type?: 'success' | 'error' | 'warn' | 'info';
    timeout?: number;
    onClose?: () => void;
  };
}
