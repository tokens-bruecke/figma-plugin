import { IResolver } from '@common/resolver';
import {
  ComposedColorValue,
  getComposedColorParts,
  isComposedColor,
  toComposedColorExpression,
  toComposedColorObject,
} from './color/composeColor';
import { isOpacityScope } from './opacityScopes';
import { ROOT_TOKEN_KEY } from './rootTokens';
import { toTokenName } from './tokenName';
import { parseDurationToSeconds, parseEasing } from './motion';

interface ImportResult {
  success: boolean;
  message: string;
  collectionsCreated: number;
  variablesCreated: number;
  variablesUpdated: number;
  errors: string[];
  /** Color aliases with a separate opacity this Figma version refused to write. */
  composedColorsRejected: number;
}

/**
 * Parses DTCG or standard token format to extract the value
 */
const getTokenValue = (token: any): any => {
  // DTCG format uses $value
  if (token.$value !== undefined) {
    return token.$value;
  }
  // Standard format uses value
  if (token.value !== undefined) {
    return token.value;
  }
  return null;
};

/**
 * Parses DTCG or standard token format to extract the type.
 * Tokens exported in strict DTCG format omit `$type` for string/boolean
 * variables (not part of the DTCG type set) — for those, fall back to the
 * original Figma type stored in `$extensions.figmaType`, or infer from the
 * value's JS type.
 */
export const getTokenType = (token: any): string | null => {
  // Opacity variables are exported as `number` (fraction) or `string` ("50%")
  // depending on settings — the OPACITY scope identifies them reliably.
  const scopes = getTokenScopes(token);
  const declaredType = token.$type ?? token.type;
  if (
    isOpacityScope(scopes) &&
    (declaredType === undefined ||
      declaredType === 'number' ||
      declaredType === 'string')
  ) {
    return 'opacity';
  }
  // Easing presets, springs and "hold" export as strings with a marker
  if (token.$extensions?.figmaType === 'EASING') {
    return 'cubicBezier';
  }
  // DTCG format uses $type
  if (token.$type !== undefined) {
    return token.$type;
  }
  // Standard format uses type
  if (token.type !== undefined) {
    return token.type;
  }
  // Strict DTCG export: original Figma type preserved in $extensions
  const figmaType = token.$extensions?.figmaType;
  if (figmaType === 'STRING') {
    return 'string';
  }
  if (figmaType === 'BOOLEAN') {
    return 'boolean';
  }
  // Strict DTCG export only stores figmaType for omitted $type — a FLOAT
  // marker means a percentage-opacity string ("50%") was exported.
  if (figmaType === 'FLOAT') {
    return 'opacity';
  }
  // Last resort: infer from the value itself
  const value = getTokenValue(token);
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (typeof value === 'string' && !value.startsWith('{')) {
    return 'string';
  }
  return null;
};

/**
 * Parses DTCG or standard token format to extract the description
 */
const getTokenDescription = (token: any): string => {
  // DTCG format uses $description
  if (token.$description !== undefined) {
    return token.$description;
  }
  // Standard format uses description
  if (token.description !== undefined) {
    return token.description;
  }
  return '';
};

const VALID_VARIABLE_SCOPES: ReadonlyArray<VariableScope> = [
  'ALL_SCOPES',
  'TEXT_CONTENT',
  'CORNER_RADIUS',
  'WIDTH_HEIGHT',
  'GAP',
  'ALL_FILLS',
  'FRAME_FILL',
  'SHAPE_FILL',
  'TEXT_FILL',
  'STROKE_COLOR',
  'STROKE_FLOAT',
  'EFFECT_FLOAT',
  'EFFECT_COLOR',
  'OPACITY',
  'COLOR_OPACITY',
  'FONT_FAMILY',
  'FONT_STYLE',
  'FONT_WEIGHT',
  'FONT_SIZE',
  'LINE_HEIGHT',
  'LETTER_SPACING',
  'PARAGRAPH_SPACING',
  'PARAGRAPH_INDENT',
];

export const isValidVariableScope = (scope: any): scope is VariableScope => {
  return VALID_VARIABLE_SCOPES.includes(scope);
};

/**
 * Scopes for a new variable whose token has none. Font families and weights
 * are read back from a single scope on export, so the variable gets that scope
 * and keeps its type through a round trip.
 */
export const getDefaultScopes = (
  tokenType: string | null
): VariableScope[] | undefined => {
  switch (tokenType) {
    case 'fontFamily':
      return ['FONT_FAMILY'];
    case 'fontWeight':
      return ['FONT_WEIGHT'];
    default:
      return undefined;
  }
};

/**
 * Parses a token to extract scopes: the `scopes` key (`includeScopes`), or
 * the `$extensions.figmaScopes` marker that opacity tokens always carry.
 */
export const getTokenScopes = (token: any): string[] | undefined => {
  if (token.scopes !== undefined && Array.isArray(token.scopes)) {
    return token.scopes;
  }
  if (Array.isArray(token.$extensions?.figmaScopes)) {
    return token.$extensions.figmaScopes;
  }
  return undefined;
};

/**
 * Tokens exported without any scopes (older exports, or other tools) can't
 * be told apart from plain numbers. When they update an existing opacity
 * variable, its scopes decide, so 0.5 is written as 50 and not as 0.5.
 */
export const resolveTypeForExistingVariable = (
  tokenType: string | null,
  token: any,
  variable: Pick<Variable, 'resolvedType' | 'scopes'> | undefined
): string | null => {
  if (
    variable?.resolvedType === 'FLOAT' &&
    isOpacityScope(variable.scopes) &&
    (tokenType === 'number' ||
      (tokenType === 'string' && /%\s*$/.test(String(getTokenValue(token)))))
  ) {
    return 'opacity';
  }
  return tokenType;
};

/**
 * Checks if an object is a token (has value and type)
 */
const isToken = (obj: any): boolean => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const value = getTokenValue(obj);
  const type = getTokenType(obj);
  return value !== null && type !== null;
};

/**
 * Converts a hex color to RGB object
 */
const hexToRgb = (
  hex: string
): { r: number; g: number; b: number; a: number } => {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  let r: number,
    g: number,
    b: number,
    a: number = 1;

  if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  } else if (hex.length === 8) {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
    a = parseInt(hex.substring(6, 8), 16) / 255;
  } else {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return { r, g, b, a };
};

/**
 * Parses RGBA CSS string to RGB object
 */
const rgbaToRgb = (
  rgba: string
): { r: number; g: number; b: number; a: number } => {
  const match = rgba.match(
    /rgba?\((\d+\.?\d*),\s*(\d+\.?\d*),\s*(\d+\.?\d*),?\s*(\d+\.?\d*)?\)/
  );
  if (!match) {
    throw new Error(`Invalid RGBA color: ${rgba}`);
  }

  return {
    r: parseFloat(match[1]) / 255,
    g: parseFloat(match[2]) / 255,
    b: parseFloat(match[3]) / 255,
    a: match[4] ? parseFloat(match[4]) : 1,
  };
};

const isReference = (value: any): value is string =>
  typeof value === 'string' && value.startsWith('{') && value.endsWith('}');

/**
 * The `collection.group.name` inside `{…}`, without a `.value` suffix and
 * without the `.$root` of a group's own token.
 */
const referenceBody = (reference: string): string =>
  reference
    .slice(1, -1)
    .replace(/\.\$?value$/, '')
    .replace(/\.\$root$/, '');

/**
 * Turns a `{collection.group.name}` reference into the `collection/group/name`
 * path used as key in the variable map.
 */
const referenceToFigmaPath = (reference: string): string =>
  referenceBody(reference).replace(/\./g, '/');

/**
 * Finds the variable a reference points at. A reference cannot tell a dot in
 * a name (`spacing/1.5`) from a group separator, so when the plain path does
 * not match, the map keys are compared in their dotted form instead.
 */
const findReferencedVariable = (
  reference: string,
  variableMap: Map<string, Variable>
): Variable | undefined => {
  const variable = variableMap.get(referenceToFigmaPath(reference));
  if (variable) {
    return variable;
  }

  const body = referenceBody(reference);
  for (const [path, candidate] of variableMap) {
    if (path.split('/').join('.') === body) {
      return candidate;
    }
  }
  return undefined;
};

const resolveReference = (
  reference: string,
  variableMap: Map<string, Variable>
): VariableAlias | null => {
  const referencedVariable = findReferencedVariable(reference, variableMap);
  return referencedVariable
    ? { type: 'VARIABLE_ALIAS', id: referencedVariable.id }
    : null;
};

/**
 * Converts an opacity token value (`0.5`, `"50%"`, `50`) to the 0..100
 * percent number Figma stores.
 */
const toOpacityPercent = (value: any): number => {
  if (typeof value === 'string' && value.trim().endsWith('%')) {
    return parseFloat(value);
  }
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof numeric !== 'number' || Number.isNaN(numeric)) {
    throw new Error(`Unsupported opacity value: ${JSON.stringify(value)}`);
  }
  // Fractions (0-1) are converted back to percent; values above 1 are
  // assumed to already be percentages.
  return numeric <= 1 ? numeric * 100 : numeric;
};

/**
 * A color value exported from a Figma color alias with its own opacity:
 * `{ components: "{color.brand}", alpha: 0.5 }` or a color object whose
 * `alpha` / `a` is a reference. See "Color aliases with opacity" in README.
 */
export const isComposedColorToken = (value: any): boolean =>
  typeof value === 'object' &&
  value !== null &&
  (isReference(value.components) ||
    isReference(value.alpha) ||
    isReference(value.a));

/**
 * A converted value that still holds a reference to a variable that does
 * not exist yet (e.g. it lives in a collection imported later). Such values
 * are set in a final pass once every variable has been created.
 */
export const hasUnresolvedReference = (value: any): boolean =>
  isReference(value) || isComposedColorToken(value);

/**
 * Converts a composed color token back into the value Figma stores for a
 * color alias with its own opacity (`{ color, opacity }`). Returns `null`
 * when a referenced variable cannot be found in the map (yet).
 */
export const convertComposedColorToFigmaValue = (
  value: any,
  variableMap: Map<string, Variable>
): ComposedColorValue | null => {
  const alphaValue = 'alpha' in value ? value.alpha : value.a;

  let base: RGBA | VariableAlias;
  if (isReference(value.components)) {
    const alias = resolveReference(value.components, variableMap);
    if (!alias) {
      return null;
    }
    base = alias;
  } else {
    // The base color is a literal: rebuild it as a plain, opaque color value
    // and reuse the regular color parsing.
    let plain: any;
    if (typeof value.components === 'string') {
      plain = value.components;
    } else if ('colorSpace' in value) {
      plain = { ...value, alpha: 1 };
    } else {
      plain = { ...value, a: 1 };
    }
    const rgba = convertTokenValueToFigmaValue(plain, 'color', variableMap);
    if (typeof rgba !== 'object' || rgba === null || !('r' in rgba)) {
      throw new Error(`Unsupported color format: ${JSON.stringify(value)}`);
    }
    base = { r: rgba.r, g: rgba.g, b: rgba.b, a: 1 };
  }

  let opacity: number | VariableAlias;
  if (isReference(alphaValue)) {
    const alias = resolveReference(alphaValue, variableMap);
    if (!alias) {
      return null;
    }
    opacity = alias;
  } else {
    opacity = toOpacityPercent(alphaValue);
  }

  return toComposedColorObject({ baseColor: base, opacity });
};

/**
 * Converts token value to Figma variable value based on type
 */
export const convertTokenValueToFigmaValue = (
  value: any,
  type: string,
  variableMap: Map<string, Variable>
): VariableValue => {
  // Handle alias references
  if (isReference(value)) {
    const alias = resolveReference(value, variableMap);
    if (alias) {
      return alias;
    }
    // Variable not found yet: keep the reference for the final pass
    return value;
  }

  // Handle actual values based on type
  switch (type) {
    case 'color':
      if (typeof value === 'string') {
        if (value.startsWith('#')) {
          return hexToRgb(value);
        } else if (value.startsWith('rgb')) {
          return rgbaToRgb(value);
        }
      } else if (typeof value === 'object' && value !== null) {
        if (isComposedColorToken(value)) {
          // Exported from a color alias with its own opacity: written back
          // as `{ color, opacity }`. Kept as-is until every referenced
          // variable exists.
          return (convertComposedColorToFigmaValue(value, variableMap) ??
            value) as VariableValue;
        }
        // DTCG 2025.10 color object: { colorSpace, components, alpha, hex }
        if ('colorSpace' in value) {
          // Prefer the hex fallback (always emitted by the plugin's DTCG export).
          // DTCG keeps it at 6 digits and the opacity in `alpha`; older
          // exports of this plugin wrote 8 digits instead
          if (typeof value.hex === 'string') {
            const rgba = hexToRgb(value.hex);
            const hasHexAlpha = [4, 8].includes(
              value.hex.replace(/^#/, '').length
            );
            return !hasHexAlpha && typeof value.alpha === 'number'
              ? { ...rgba, a: value.alpha }
              : rgba;
          }
          // Otherwise use sRGB components directly (already 0-1)
          if (value.colorSpace === 'srgb' && Array.isArray(value.components)) {
            const [r, g, b] = value.components;
            return { r, g, b, a: value.alpha ?? 1 };
          }
          throw new Error(
            `Unsupported DTCG color space without hex fallback: ${value.colorSpace}`
          );
        }
        if ('r' in value) {
          // The "RGBA Object" export writes 0-255 channels; Figma takes 0-1.
          // A channel above 1 means the 0-255 scale (so `{ r: 1, g: 1, b: 1 }`
          // stays white rather than near-black).
          if ([value.r, value.g, value.b].some((channel) => channel > 1)) {
            return {
              r: value.r / 255,
              g: value.g / 255,
              b: value.b / 255,
              a: value.a ?? 1,
            };
          }
          return value;
        }
      }
      throw new Error(`Unsupported color format: ${JSON.stringify(value)}`);

    case 'fontWeight':
      // Figma font-weight variables can be numeric (400) or string ("Bold")
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        const numeric = Number(value);
        return Number.isNaN(numeric) ? value : numeric;
      }
      return value;

    case 'fontFamily':
      // DTCG allows a fallback list; a Figma font-family variable holds one name
      return Array.isArray(value) ? String(value[0] ?? '') : String(value);

    case 'opacity':
      // Figma stores opacity as a 0-100 percent number.
      // Exports produce either "50%" (percentage setting) or 0.5 (fraction).
      return toOpacityPercent(value);

    case 'number':
    case 'dimension':
      // DTCG 2025.10 dimension object: { value: 6, unit: "px" }
      if (
        typeof value === 'object' &&
        value !== null &&
        typeof value.value === 'number'
      ) {
        return value.value;
      }
      // Legacy string format: remove px, rem, etc. and convert to number
      if (typeof value === 'string') {
        return parseFloat(value.replace(/[a-z%]+$/i, ''));
      }
      return parseFloat(value);

    case 'duration':
      // Design tokens use milliseconds, Figma stores TIMING in seconds
      return parseDurationToSeconds(value);

    case 'cubicBezier':
      return parseEasing(value);

    case 'boolean':
      return Boolean(value);

    case 'string':
      return String(value);

    default:
      // For unknown types, try to return as-is
      return value;
  }
};

/**
 * Maps token type to Figma variable resolved type.
 * `fontWeight` (valid DTCG type) can be numeric (400) or string ("Bold")
 * in Figma, so the value is used to disambiguate.
 */
export const mapTokenTypeToFigmaType = (
  tokenType: string,
  value?: any
): VariableResolvedDataType => {
  if (tokenType === 'fontWeight') {
    return typeof value === 'string' && Number.isNaN(Number(value))
      ? 'STRING'
      : 'FLOAT';
  }

  const typeMap: Record<string, VariableResolvedDataType> = {
    color: 'COLOR',
    number: 'FLOAT',
    dimension: 'FLOAT',
    opacity: 'FLOAT',
    boolean: 'BOOLEAN',
    string: 'STRING',
    fontFamily: 'STRING',
    duration: 'TIMING',
    cubicBezier: 'EASING',
  };

  return typeMap[tokenType] || 'STRING';
};

const legacyTokenKeys = [
  'value',
  'type',
  'description',
  'scopes',
  'extensions',
];

/**
 * A DTCG token can leave out `$type` and take it from the closest group
 * (format §6.4: type inheritance), so the token is copied with that type.
 */
const withInheritedType = (token: any, inheritedType: string | undefined) =>
  inheritedType &&
  token &&
  typeof token === 'object' &&
  token.$value !== undefined &&
  token.$type === undefined &&
  token.type === undefined
    ? { ...token, $type: inheritedType }
    : token;

/**
 * Extracts all tokens from a nested object structure
 */
const extractTokens = (
  obj: any,
  path: string[] = [],
  collectionName: string,
  inheritedType?: string
): Array<{ path: string; token: any; collectionName: string }> => {
  const tokens: Array<{ path: string; token: any; collectionName: string }> =
    [];

  // In the legacy format these keys belong to a token. In a group they are
  // ordinary names, e.g. the variable "type/body/size", or a token named
  // "value"
  const isTokenLike =
    obj.$value !== undefined ||
    (obj.value !== undefined && !isToken(obj.value));
  const groupType =
    !isTokenLike && typeof obj.$type === 'string' ? obj.$type : inheritedType;

  for (const key in obj) {
    // DTCG 2025.10: the token of the group itself, i.e. the variable named
    // like the group ("border/brand" next to "border/brand/subtle")
    if (key === ROOT_TOKEN_KEY && path.length > 0) {
      const rootToken = withInheritedType(obj[key], groupType);
      if (isToken(rootToken) || rootToken?.$value !== undefined) {
        tokens.push({ path: path.join('/'), token: rootToken, collectionName });
      }
      continue;
    }

    if (key.startsWith('$') || (isTokenLike && legacyTokenKeys.includes(key))) {
      continue; // Skip metadata keys
    }

    const value = withInheritedType(obj[key], groupType);

    // A `$value` without any type is still listed, so the import reports it
    // as "missing type" instead of dropping it silently
    if (isToken(value) || value?.$value !== undefined) {
      const tokenPath = [...path, key].join('/');
      tokens.push({ path: tokenPath, token: value, collectionName });
      // Older exports, and the legacy format, put such child tokens into
      // the token object itself
      tokens.push(
        ...extractTokens(value, [...path, key], collectionName, groupType)
      );
    } else if (typeof value === 'object' && value !== null) {
      // Recursively extract from nested objects
      tokens.push(
        ...extractTokens(value, [...path, key], collectionName, groupType)
      );
    }
  }

  return tokens;
};

/**
 * The type of the token a reference points at, for an alias token without
 * `$type`: its own type, the type it inherits from its groups, or the type
 * of the token it aliases in turn.
 */
const getReferencedTokenType = (
  tokensData: any,
  reference: string,
  depth = 0
): string | null => {
  if (depth > 10) {
    return null;
  }

  let node = tokensData;
  let inheritedType: string | undefined;
  for (const segment of referenceBody(reference).split('.')) {
    if (!node || typeof node !== 'object') {
      return null;
    }
    if (typeof node.$type === 'string' && node.$value === undefined) {
      inheritedType = node.$type;
    }
    node = node[segment];
  }

  const token =
    node && node.$value === undefined && node[ROOT_TOKEN_KEY]
      ? node[ROOT_TOKEN_KEY]
      : node;
  if (!token || typeof token !== 'object') {
    return null;
  }

  const type = getTokenType(withInheritedType(token, inheritedType));
  if (type) {
    return type;
  }

  const value = getTokenValue(token);
  return isReference(value)
    ? getReferencedTokenType(tokensData, value, depth + 1)
    : null;
};

/**
 * Older Figma clients can read color aliases with a separate opacity but
 * reject writing them ("Composed color variable values are not supported").
 * Figma enabled the write in `setValueForMode` with plugin typings 1.139.0;
 * this issue tracked it.
 */
export const COMPOSED_COLOR_ISSUE_URL =
  'https://github.com/figma/plugin-typings/issues/375';

interface SetValueContext {
  errors: string[];
  /** Composed colors an outdated Figma client refused to write. */
  composedColorsRejected: number;
}

/**
 * Sets a variable value. A composed color is tried in every shape a Figma
 * runtime has accepted so far; one the runtime still rejects is left
 * untouched and counted, so the import result can point at the Figma issue
 * instead of silently degrading the token.
 */
const setVariableValue = (
  variable: Variable,
  modeId: string,
  figmaValue: VariableValue | ComposedColorValue,
  label: string,
  context: SetValueContext
) => {
  const trySet = (value: any): string | null => {
    try {
      variable.setValueForMode(modeId, value);
      return null;
    } catch (error) {
      return error?.message ?? String(error);
    }
  };

  if (!isComposedColor(figmaValue)) {
    const error = trySet(figmaValue);
    if (error) {
      context.errors.push(`Failed to set value for ${label}: ${error}`);
    }
    return;
  }

  const parts = getComposedColorParts(figmaValue);
  // Current runtimes take `{ color, opacity }`; Desktop 126.x exposed the
  // COMPOSE_COLOR expression instead, so fall back to that.
  const candidates = [
    toComposedColorObject(parts),
    toComposedColorExpression(parts),
  ];

  let reason = '';
  for (const candidate of candidates) {
    const error = trySet(candidate);
    if (error) {
      reason = error;
      continue;
    }
    // Some clients drop the value without throwing: verify it actually stuck.
    if (isComposedColor(variable.valuesByMode?.[modeId])) {
      return;
    }
    reason = 'the value was ignored by setValueForMode';
  }

  context.composedColorsRejected++;
  context.errors.push(
    `Skipped ${label}: this Figma version cannot write color aliases with a separate opacity (${reason}). Update Figma to the latest version and import again. See ${COMPOSED_COLOR_ISSUE_URL}`
  );
};

/**
 * Import design tokens and create Figma variables
 */
export const tokensToVariables = async (
  tokensData: any,
  resolver: IResolver
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: false,
    message: '',
    collectionsCreated: 0,
    variablesCreated: 0,
    variablesUpdated: 0,
    errors: [],
    composedColorsRejected: 0,
  };

  try {
    // Get existing collections and variables
    const existingCollections = await resolver.getLocalVariableCollections();
    const existingVariables = await resolver.getLocalVariables();

    // Create a map of existing variables by their full path
    const variableMap = new Map<string, Variable>();
    existingVariables.forEach((variable) => {
      const collection = existingCollections.find(
        (c) => c.id === variable.variableCollectionId
      );
      if (collection) {
        // Use slash separator to match the path format. The export writes
        // the collection under its token name ("1. Primitives" becomes
        // "1- Primitives"), so the variable is found under both
        variableMap.set(`${collection.name}/${variable.name}`, variable);
        variableMap.set(
          `${toTokenName(collection.name)}/${variable.name}`,
          variable
        );
      }
    });

    // An extended collection lists the variables it inherits, which belong
    // to its root collection. Its tokens update those variables, with the
    // values written as overrides for the extension's modes
    existingCollections
      .filter((collection) => (collection as any).isExtension)
      .forEach((extension) => {
        extension.variableIds?.forEach((variableId) => {
          const variable = existingVariables.find((v) => v.id === variableId);
          if (variable) {
            variableMap.set(`${extension.name}/${variable.name}`, variable);
            variableMap.set(
              `${toTokenName(extension.name)}/${variable.name}`,
              variable
            );
          }
        });
      });

    // The meta sits at the root of a file, or inside the collection group
    // in the files of a split export
    const metaOf = (collectionData: any) =>
      collectionData?.$extensions?.['tokens-bruecke-meta'] ??
      tokensData?.$extensions?.['tokens-bruecke-meta'];

    // The Figma name of a collection whose token name differs
    const toFigmaCollectionName = (tokenName: string, meta: any): string =>
      (Array.isArray(meta?.variableCollections)
        ? meta.variableCollections
        : []
      ).find(
        (name) =>
          typeof name === 'string' &&
          name !== tokenName &&
          toTokenName(name) === tokenName
      ) ?? tokenName;

    // Remove metadata if present
    const cleanedData = { ...tokensData };
    delete cleanedData.$extensions;

    // Values referencing variables that do not exist yet (typically in a
    // collection imported later). They are set once every variable exists.
    const deferredValues: Array<{
      variable: Variable;
      modeId: string;
      value: any;
      type: string;
      path: string;
    }> = [];

    // Extract all collections from the tokens
    const collections: Map<string, any> = new Map();

    for (const collectionName in cleanedData) {
      const collectionData = cleanedData[collectionName];

      if (typeof collectionData === 'object' && collectionData !== null) {
        collections.set(collectionName, collectionData);
      }
    }

    // Process each collection
    for (const [collectionName, collectionData] of collections) {
      try {
        const meta = metaOf(collectionData);
        const figmaCollectionName = toFigmaCollectionName(collectionName, meta);
        // A file of a split-by-mode export holds the values of this one mode
        const fileModeName: string | undefined =
          typeof meta?.mode === 'string' && meta.mode ? meta.mode : undefined;
        let isNewCollection = false;

        // Check if collection already exists
        let collection =
          existingCollections.find((c) => c.name === figmaCollectionName) ??
          existingCollections.find((c) => c.name === collectionName);

        // Create collection if it doesn't exist (only possible in plugin context)
        if (!collection && typeof figma !== 'undefined') {
          try {
            collection =
              figma.variables.createVariableCollection(figmaCollectionName);
            result.collectionsCreated++;
            isNewCollection = true;
          } catch (error) {
            result.errors.push(
              `Failed to create collection "${collectionName}": ${error.message}`
            );
            continue;
          }
        } else if (!collection) {
          result.errors.push(
            `Collection "${collectionName}" not found and cannot be created (not in plugin context)`
          );
          continue;
        }

        // Extract all tokens from this collection
        const tokens = extractTokens(collectionData, [], collectionName).map(
          (entry) => {
            const value = getTokenValue(entry.token);
            if (getTokenType(entry.token) || !isReference(value)) {
              return entry;
            }
            const referencedType = getReferencedTokenType(cleanedData, value);
            return referencedType
              ? { ...entry, token: { ...entry.token, $type: referencedType } }
              : entry;
          }
        );

        // Process tokens and check for modes
        const modesData = new Map<string, Map<string, any>>();

        tokens.forEach(({ path, token }) => {
          const modes = token.$extensions?.mode || token.extensions?.mode;

          if (modes && typeof modes === 'object') {
            // Token has multiple mode values
            for (const modeName in modes) {
              if (!modesData.has(modeName)) {
                modesData.set(modeName, new Map());
              }
              modesData.get(modeName)!.set(path, {
                value: modes[modeName],
                type: getTokenType(token),
                description: getTokenDescription(token),
              });
            }
          }
        });

        // An extended collection inherits its modes: they can't be renamed
        // or added, so the tokens have to use the existing mode names
        const isExtension = (collection as any).isExtension === true;
        const missingModes = [
          ...Array.from(modesData.keys()),
          ...(fileModeName ? [fileModeName] : []),
        ].filter((name) => !collection.modes.some((m) => m.name === name));
        if (isExtension && missingModes.length > 0) {
          result.errors.push(
            `Extended collection "${collectionName}" has no mode ${missingModes
              .map((name) => `"${name}"`)
              .join(
                ', '
              )}: its values were skipped. Extended collections inherit their modes from their parent.`
          );
        }

        // Create modes if they don't exist (only in plugin context)
        if (
          modesData.size > 0 &&
          !isExtension &&
          typeof figma !== 'undefined' &&
          collection
        ) {
          const modeNames = Array.from(modesData.keys());

          // Check if the first mode needs to be renamed
          const firstModeName = modeNames[0];
          if (
            collection.modes.length > 0 &&
            collection.modes[0].name !== firstModeName
          ) {
            try {
              // Rename the default mode to the first mode from tokens
              collection.renameMode(collection.modes[0].modeId, firstModeName);
            } catch (error) {
              result.errors.push(
                `Failed to rename default mode to "${firstModeName}": ${error.message}`
              );
            }
          }

          // Add any remaining modes
          for (let i = 1; i < modeNames.length; i++) {
            const modeName = modeNames[i];
            const existingMode = collection.modes.find(
              (m) => m.name === modeName
            );
            if (!existingMode) {
              try {
                // Add a new mode to the collection
                collection.addMode(modeName);
              } catch (error) {
                result.errors.push(
                  `Failed to create mode "${modeName}" in collection "${collectionName}": ${error.message}`
                );
              }
            }
          }

          // Refresh collection reference to get updated modes
          const updatedCollection =
            await figma.variables.getVariableCollectionByIdAsync(collection.id);
          if (updatedCollection) {
            collection = updatedCollection;
          }
        }

        // A split-by-mode file has no mode map: its values belong to the
        // mode named in the meta, not to the default mode
        let valueModeId: string | undefined;
        if (
          fileModeName &&
          modesData.size === 0 &&
          !(isExtension && missingModes.length > 0) &&
          typeof figma !== 'undefined' &&
          collection
        ) {
          try {
            if (!collection.modes.some((m) => m.name === fileModeName)) {
              if (isNewCollection) {
                collection.renameMode(collection.modes[0].modeId, fileModeName);
              } else {
                collection.addMode(fileModeName);
              }
              collection =
                (await figma.variables.getVariableCollectionByIdAsync(
                  collection.id
                )) ?? collection;
            }
            valueModeId = collection.modes.find(
              (m) => m.name === fileModeName
            )?.modeId;
          } catch (error) {
            result.errors.push(
              `Failed to create mode "${fileModeName}" in collection "${collectionName}": ${error.message}`
            );
            continue;
          }
        }

        // First pass: Create all variables (without setting values yet)
        const createdVariables: Array<{
          variable: Variable;
          token: any;
          path: string;
          tokenType: string;
        }> = [];
        for (const { path, token } of tokens) {
          try {
            let tokenType = getTokenType(token);
            const tokenDescription = getTokenDescription(token);
            let tokenScopes = getTokenScopes(token);

            if (!tokenType) {
              result.errors.push(`Token at path "${path}" is missing type`);
              continue;
            }

            const fullPath = `${collectionName}/${path}`;

            // Check if variable already exists
            let variable = variableMap.get(fullPath);
            const isExisting = !!variable;
            tokenType = resolveTypeForExistingVariable(
              tokenType,
              token,
              variable
            );
            const figmaType = mapTokenTypeToFigmaType(
              tokenType,
              getTokenValue(token)
            );

            // The import does not change the type of a variable, so a value
            // of another type could not be written to it. A font weight can
            // be a number or a string variable in Figma.
            const fitsVariable =
              variable?.resolvedType === figmaType ||
              (tokenType === 'fontWeight' &&
                ['FLOAT', 'STRING'].includes(variable?.resolvedType));

            if (isExisting && !fitsVariable) {
              result.errors.push(
                `Variable "${path}" is ${variable.resolvedType} in Figma, but the token is ${figmaType} (${tokenType}): skipped. Rename or delete the variable to import this token.`
              );
              continue;
            }

            if (!variable && isExtension) {
              result.errors.push(
                `Variable "${path}" is not in the extended collection "${collectionName}": skipped. Add it to the root collection.`
              );
              continue;
            }

            if (!variable && typeof figma !== 'undefined' && collection) {
              // Create new variable - pass collection object, not ID
              variable = figma.variables.createVariable(
                path,
                collection,
                figmaType
              );

              variableMap.set(fullPath, variable);
              result.variablesCreated++;
            } else if (isExisting) {
              result.variablesUpdated++;
            }

            // Leave the scopes of an existing variable alone
            if (!isExisting && !tokenScopes) {
              tokenScopes = getDefaultScopes(tokenType);
            }

            // The description and scopes of an inherited variable belong to
            // its root collection
            if (variable && !isExtension) {
              if (tokenDescription) {
                variable.description = tokenDescription;
              }

              // Figma rejects scopes on TIMING and EASING variables
              const acceptsScopes =
                variable.resolvedType !== 'TIMING' &&
                variable.resolvedType !== 'EASING';

              if (tokenScopes && acceptsScopes) {
                const invalidScopes = tokenScopes.filter(
                  (s) => !isValidVariableScope(s)
                );
                if (invalidScopes.length > 0) {
                  result.errors.push(
                    `Token at path "${path}" has invalid scopes: ${invalidScopes.join(
                      ', '
                    )}`
                  );
                }
                const validScopes = tokenScopes.filter(isValidVariableScope);
                if (validScopes.length > 0) {
                  try {
                    variable.scopes = validScopes;
                  } catch (error) {
                    // e.g. an older runtime that does not know `COLOR_OPACITY`
                    result.errors.push(
                      `Failed to set scopes for variable "${path}": ${error.message}`
                    );
                  }
                }
              }
            }

            // Store for second pass (value setting)
            if (variable) {
              createdVariables.push({ variable, token, path, tokenType });
            }
          } catch (error) {
            result.errors.push(
              `Failed to create variable at path "${path}": ${error.message}`
            );
          }
        }

        // Second pass: Set values for all variables (now all variables exist for alias resolution)
        for (const { variable, token, path, tokenType } of createdVariables) {
          try {
            const tokenValue = getTokenValue(token);

            if (typeof figma !== 'undefined') {
              // `$value` is the value of the default mode
              const defaultModeId =
                valueModeId ??
                collection!.defaultModeId ??
                collection!.modes[0].modeId;
              const figmaValue = convertTokenValueToFigmaValue(
                tokenValue,
                tokenType,
                variableMap
              );

              if (hasUnresolvedReference(figmaValue)) {
                deferredValues.push({
                  variable,
                  modeId: defaultModeId,
                  value: tokenValue,
                  type: tokenType,
                  path: `${collectionName}/${path}`,
                });
              } else {
                setVariableValue(
                  variable,
                  defaultModeId,
                  figmaValue,
                  `variable "${path}"`,
                  result
                );
              }

              // Set values for other modes if they exist
              const modes = token.$extensions?.mode || token.extensions?.mode;
              if (modes && typeof modes === 'object') {
                for (const modeName in modes) {
                  const mode = collection!.modes.find(
                    (m) => m.name === modeName
                  );
                  if (mode) {
                    const modeValue = convertTokenValueToFigmaValue(
                      modes[modeName],
                      tokenType,
                      variableMap
                    );

                    if (hasUnresolvedReference(modeValue)) {
                      deferredValues.push({
                        variable,
                        modeId: mode.modeId,
                        value: modes[modeName],
                        type: tokenType,
                        path: `${collectionName}/${path}`,
                      });
                      continue;
                    }

                    setVariableValue(
                      variable,
                      mode.modeId,
                      modeValue,
                      `mode "${modeName}" in variable "${path}"`,
                      result
                    );
                  }
                }
              }
            }
          } catch (error) {
            result.errors.push(
              `Failed to set value for variable at path "${path}": ${error.message}`
            );
          }
        }
      } catch (error) {
        result.errors.push(
          `Failed to process collection "${collectionName}": ${error.message}`
        );
      }
    }

    // Third pass: set the values whose references could not be resolved
    // before, now that every variable from every collection exists.
    for (const { variable, modeId, value, type, path } of deferredValues) {
      try {
        const figmaValue = convertTokenValueToFigmaValue(
          value,
          type,
          variableMap
        );
        if (hasUnresolvedReference(figmaValue)) {
          result.errors.push(
            `Alias reference not found for "${path}": ${JSON.stringify(value)}`
          );
          continue;
        }
        setVariableValue(variable, modeId, figmaValue, `"${path}"`, result);
      } catch (error) {
        result.errors.push(
          `Failed to resolve alias for "${path}": ${error.message}`
        );
      }
    }

    result.success = true;
    const parts: string[] = [];
    if (result.collectionsCreated > 0) {
      parts.push(`Created ${result.collectionsCreated} collection(s)`);
    }
    if (result.variablesCreated > 0) {
      parts.push(`created ${result.variablesCreated} variable(s)`);
    }
    if (result.variablesUpdated > 0) {
      parts.push(`updated ${result.variablesUpdated} variable(s)`);
    }

    result.message = `Successfully imported tokens. ${parts.join(', ')}.`;

    if (result.composedColorsRejected > 0) {
      result.message += ` ${result.composedColorsRejected} value(s) skipped: this Figma version cannot write color aliases with a separate opacity. Update Figma to the latest version and import again.`;
    }
    const otherErrors = result.errors.length - result.composedColorsRejected;
    if (otherErrors > 0) {
      const firstOther = result.errors.find(
        (error) => !error.startsWith('Skipped ')
      );
      result.message += ` ${otherErrors} error(s): ${firstOther} (see the plugin console for the full list)`;
    }
  } catch (error) {
    result.success = false;
    result.message = `Import failed: ${error.message}`;
    result.errors.push(error.message);
  }

  return result;
};
