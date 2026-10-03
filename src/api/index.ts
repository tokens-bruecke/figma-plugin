/// <reference path="../../global.d.ts" />

import { getTokens } from '@common/export';
import { RestAPIResolver, restVariablesToSnapshot } from '../cli/restApiResolver';
import { FileResolver, validateSnapshot } from '../cli/fileResolver';
import { resolveExportOptions } from '../cli/options';
import { silentLog } from '../cli/logger';
import type {
  ExportOptions,
  FetchTokensParams,
  LocalVariablesResponse,
  TokenTree,
  TokensSnapshot,
  TokensBrueckeErrorCode,
} from '../../api';

export type {
  ColorMode,
  ExportOptions,
  FetchTokensParams,
  LocalVariablesResponse,
  StyleInclusion,
  TokenTree,
  TokensBrueckeErrorCode,
  TokensSnapshot,
} from '../../api';

export class TokensBrueckeError extends Error {
  readonly code: TokensBrueckeErrorCode;
  readonly cause?: unknown;

  constructor(
    code: TokensBrueckeErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.name = 'TokensBrueckeError';
    this.code = code;
    this.cause = options?.cause;
    // Keeps `instanceof` working when compiled to ES5-style classes
    Object.setPrototypeOf(this, TokensBrueckeError.prototype);
  }
}

const messageOf = (error: any): string => error?.message ?? String(error);

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toFigmaError = (error: any): TokensBrueckeError => {
  if (error instanceof TokensBrueckeError) {
    return error;
  }
  const status: number | undefined = error?.response?.status ?? error?.status;
  const detail = messageOf(error);

  if (status === 403) {
    return new TokensBrueckeError(
      'FIGMA_FORBIDDEN',
      `Figma refused the request (403): ${detail}. The Variables REST API needs a Figma Enterprise plan and a token with the file_variables:read scope.`,
      { cause: error }
    );
  }
  if (status === 404) {
    return new TokensBrueckeError(
      'FIGMA_NOT_FOUND',
      `Figma file not found (404): ${detail}. Check the file key and that the token has access to the file.`,
      { cause: error }
    );
  }
  if (status === 429) {
    return new TokensBrueckeError(
      'FIGMA_RATE_LIMITED',
      `Figma rate limit reached (429): ${detail}`,
      { cause: error }
    );
  }
  return new TokensBrueckeError(
    'FIGMA_REQUEST_FAILED',
    `Error fetching tokens from Figma: ${detail}`,
    { cause: error }
  );
};

export async function fetchTokens({
  fileKey,
  personalAccessToken,
  oauthToken,
  options = {},
}: FetchTokensParams): Promise<TokenTree> {
  if (!fileKey) {
    throw new TokensBrueckeError('INVALID_ARGUMENT', 'fileKey is required');
  }
  if (!personalAccessToken && !oauthToken) {
    throw new TokensBrueckeError(
      'INVALID_ARGUMENT',
      'Either personalAccessToken or oauthToken is required'
    );
  }

  const resolver = new RestAPIResolver(
    fileKey,
    personalAccessToken,
    oauthToken,
    silentLog
  );

  try {
    return await getTokens(resolver, resolveExportOptions(options, {}));
  } catch (error) {
    throw toFigmaError(error);
  }
}

export async function convertTokens(
  input: TokensSnapshot | LocalVariablesResponse,
  options: ExportOptions = {}
): Promise<TokenTree> {
  let resolver: FileResolver;
  try {
    const snapshot = isPlainObject(input) && 'meta' in input
      ? restVariablesToSnapshot(validateRestResponse(input))
      : input;
    resolver = new FileResolver(
      validateSnapshot(snapshot, 'The snapshot'),
      silentLog
    );
  } catch (error) {
    throw new TokensBrueckeError('INVALID_SNAPSHOT', messageOf(error), {
      cause: error,
    });
  }

  try {
    return await getTokens(resolver, resolveExportOptions(options, {}));
  } catch (error) {
    throw new TokensBrueckeError(
      'CONVERSION_FAILED',
      `Error transforming tokens: ${messageOf(error)}`,
      { cause: error }
    );
  }
}

const validateRestResponse = (input: Record<string, any>) => {
  const { meta } = input;
  for (const key of ['variables', 'variableCollections']) {
    if (!isPlainObject(meta?.[key])) {
      throw new Error(`The REST response is missing "meta.${key}"`);
    }
  }
  return meta as LocalVariablesResponse['meta'];
};
