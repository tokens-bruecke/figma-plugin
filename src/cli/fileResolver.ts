import { IResolver } from '@common/resolver';
import { log } from './logger';

/**
 * A snapshot of a Figma file's local variables and styles, using the raw
 * Plugin API object shapes verbatim. Anything that can produce these objects —
 * the Plugin API, an agent running inside Figma, a hand-written fixture — can
 * feed the transform pipeline without a lossy reshaping step.
 *
 * See schemas/tokens-snapshot.schema.json for the documented contract.
 */
export interface TokensSnapshotI {
  variables: Variable[];
  variableCollections: VariableCollection[];
  paintStyles?: PaintStyle[];
  textStyles?: TextStyle[];
  effectStyles?: EffectStyle[];
  gridStyles?: GridStyle[];
}

const STYLE_KEYS = [
  'paintStyles',
  'textStyles',
  'effectStyles',
  'gridStyles',
] as const;

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Parse and validate a snapshot, failing with a message that names the
 * offending key so an agent can correct its dump without guesswork.
 */
export const parseSnapshot = (raw: string, source: string): TokensSnapshotI => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error: any) {
    throw new Error(`${source} is not valid JSON: ${error?.message ?? error}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(
      `${source} must be a JSON object with "variables" and "variableCollections" keys`
    );
  }

  for (const key of ['variables', 'variableCollections'] as const) {
    if (!Array.isArray(parsed[key])) {
      throw new Error(`${source} is missing the required "${key}" array`);
    }
  }

  for (const key of STYLE_KEYS) {
    if (parsed[key] !== undefined && !Array.isArray(parsed[key])) {
      throw new Error(`${source}: "${key}" must be an array when present`);
    }
  }

  parsed.variableCollections.forEach((collection: any, index: number) => {
    for (const key of ['id', 'name'] as const) {
      if (typeof collection?.[key] !== 'string') {
        throw new Error(
          `${source}: variableCollections[${index}] is missing a string "${key}"`
        );
      }
    }
    if (!Array.isArray(collection.modes)) {
      throw new Error(
        `${source}: variableCollections[${index}] ("${collection.name}") is missing a "modes" array`
      );
    }
  });

  parsed.variables.forEach((variable: any, index: number) => {
    for (const key of ['id', 'name', 'variableCollectionId'] as const) {
      if (typeof variable?.[key] !== 'string') {
        throw new Error(
          `${source}: variables[${index}] is missing a string "${key}"`
        );
      }
    }
    if (!isPlainObject(variable.valuesByMode)) {
      throw new Error(
        `${source}: variables[${index}] ("${variable.name}") is missing a "valuesByMode" object`
      );
    }
  });

  return parsed as unknown as TokensSnapshotI;
};

/**
 * Resolves tokens from a local snapshot instead of the Figma REST API.
 * Mirrors RestAPIResolver's behaviour: aliases pointing at variables outside
 * the snapshot (e.g. library variables) resolve to `#missing#`, same as the
 * REST path.
 */
export class FileResolver implements IResolver {
  private variables: Map<string, Variable>;
  private variableCollections: Map<string, VariableCollection>;
  private snapshot: TokensSnapshotI;

  constructor(snapshot: TokensSnapshotI) {
    this.snapshot = snapshot;
    this.variables = new Map(
      snapshot.variables.map((variable) => [
        variable.id,
        // The transforms read `scopes` unguarded; the Plugin and REST APIs
        // always return it, but a hand-written snapshot may omit it.
        variable.scopes ? variable : { ...variable, scopes: [] },
      ])
    );
    this.variableCollections = new Map(
      snapshot.variableCollections.map((collection) => [
        collection.id,
        collection,
      ])
    );
    log(
      '✅ Loaded %d variables in %d collections from snapshot',
      this.variables.size,
      this.variableCollections.size
    );
  }

  async getLocalVariableCollections(): Promise<VariableCollection[]> {
    return [...this.variableCollections.values()];
  }

  async getLocalVariables(): Promise<Variable[]> {
    return [...this.variables.values()];
  }

  async getLocalPaintStyles(): Promise<PaintStyle[]> {
    return this.snapshot.paintStyles ?? [];
  }

  async getLocalTextStyles(): Promise<TextStyle[]> {
    return this.snapshot.textStyles ?? [];
  }

  async getLocalEffectStyles(): Promise<EffectStyle[]> {
    return this.snapshot.effectStyles ?? [];
  }

  async getLocalGridStyles(): Promise<GridStyle[]> {
    return this.snapshot.gridStyles ?? [];
  }

  async getVariableById(variableId: string): Promise<Variable | null> {
    return this.variables.get(variableId) ?? null;
  }

  async getVariableCollectionById(
    id: string
  ): Promise<VariableCollection | null> {
    return this.variableCollections.get(id) ?? null;
  }
}
