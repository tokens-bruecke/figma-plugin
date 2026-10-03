/**
 * Type declarations for `tokens-bruecke/api`.
 *
 * Kept self-contained (no ambient globals), so it can be shipped as is.
 * `src/api/index.ts` imports these types, so the implementation is checked
 * against what consumers see.
 */

export type ColorMode =
  | 'hex'
  | 'rgba-object'
  | 'rgba-css'
  | 'srgb-dtcg'
  | 'hsla-object'
  | 'hsla-css'
  | 'hsl-dtcg'
  | 'oklch-dtcg';

export interface StyleInclusion {
  isIncluded: boolean;
  /** Name of the token group the styles are exported under. */
  customName: string;
}

/**
 * The export options. Same fields as the CLI config file
 * (`schemas/cli-options.schema.json`); every field is optional and missing
 * ones get the same defaults as the CLI.
 */
export interface ExportOptions {
  /** Each style type is merged with its default. */
  includedStyles?: {
    text?: Partial<StyleInclusion>;
    effects?: Partial<StyleInclusion>;
    grids?: Partial<StyleInclusion>;
    colors?: Partial<StyleInclusion>;
  };
  includeScopes?: boolean;
  useDTCG?: boolean;
  includeValueStringKeyToAlias?: boolean;
  colorMode?: ColorMode;
  storeStyleInCollection?: string;
  includeFigmaMetaData?: boolean;
  usePercentageOpacity?: boolean;
  expandEasingPresets?: boolean;
  splitByCollection?: boolean;
  splitByMode?: boolean;
  omitCollectionNames?: boolean;
  /** Leave `createdAt` out of the metadata, so unchanged files export identically. */
  omitCreatedAt?: boolean;
}

/**
 * A DTCG token tree. The result of `fetchTokens` and `convertTokens`:
 * - one tree when nothing is split
 * - keyed by collection name with `splitByCollection`
 * - keyed by `collection/mode` with `splitByMode`
 *
 * The split keys are the file paths the CLI writes, minus the
 * `.tokens.json` extension.
 */
export type TokenTree = Record<string, any>;

/**
 * Local variables and styles in the Plugin API shapes
 * (`schemas/tokens-snapshot.schema.json`). Extra properties are allowed.
 */
export interface TokensSnapshot {
  variableCollections: Array<{
    id: string;
    name: string;
    modes: Array<{ modeId: string; name: string }>;
    [key: string]: any;
  }>;
  variables: Array<{
    id: string;
    name: string;
    variableCollectionId: string;
    valuesByMode: Record<string, any>;
    [key: string]: any;
  }>;
  paintStyles?: Array<Record<string, any>>;
  textStyles?: Array<Record<string, any>>;
  effectStyles?: Array<Record<string, any>>;
  gridStyles?: Array<Record<string, any>>;
}

/**
 * The response of `GET /v1/files/:key/variables/local`. It holds no styles,
 * so style options have no effect on it.
 */
export interface LocalVariablesResponse {
  meta: {
    variables: Record<string, any>;
    variableCollections: Record<string, any>;
  };
  [key: string]: any;
}

export interface FetchTokensParams {
  fileKey: string;
  /** Figma personal access token. Either this or `oauthToken` is required. */
  personalAccessToken?: string;
  /** Figma OAuth token. Used instead of `personalAccessToken` when both are set. */
  oauthToken?: string;
  options?: ExportOptions;
}

export type TokensBrueckeErrorCode =
  /** A required argument is missing, e.g. the file key or the token. */
  | 'INVALID_ARGUMENT'
  /** The snapshot or REST response does not have the expected shape. */
  | 'INVALID_SNAPSHOT'
  /** 403: the Variables API needs an Enterprise plan and the `file_variables:read` scope. */
  | 'FIGMA_FORBIDDEN'
  /** 404: wrong file key, or the token has no access to the file. */
  | 'FIGMA_NOT_FOUND'
  | 'FIGMA_RATE_LIMITED'
  /** Any other failed request to Figma. */
  | 'FIGMA_REQUEST_FAILED'
  /** The data was valid but could not be converted. */
  | 'CONVERSION_FAILED';

export declare class TokensBrueckeError extends Error {
  readonly code: TokensBrueckeErrorCode;
  /** The original error, when there is one. */
  readonly cause?: unknown;
  constructor(
    code: TokensBrueckeErrorCode,
    message: string,
    options?: { cause?: unknown }
  );
}

/** Fetches the variables from the Figma REST API and converts them to tokens. */
export declare function fetchTokens(
  params: FetchTokensParams
): Promise<TokenTree>;

/**
 * Converts data you already have to tokens. Accepts a snapshot, or the raw
 * response of the Figma REST variables endpoint (detected by its `meta` key).
 */
export declare function convertTokens(
  input: TokensSnapshot | LocalVariablesResponse,
  options?: ExportOptions
): Promise<TokenTree>;
