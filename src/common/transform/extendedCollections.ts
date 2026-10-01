import { IResolver } from '@common/resolver';

/**
 * Fields the Figma REST API adds to a collection created with "Extend a
 * variable collection". They are missing from the plugin typings that the rest
 * of the code is written against.
 */
type ExtensionFields = {
  isExtension?: boolean;
  parentVariableCollectionId?: string;
  rootVariableCollectionId?: string;
  variableOverrides?: Record<string, Record<string, any>>;
};

type CollectionsById = Map<string, VariableCollection>;

const asExtension = (collection: VariableCollection) =>
  collection as VariableCollection & ExtensionFields;

export const isExtendedCollection = (collection: VariableCollection) =>
  asExtension(collection).isExtension === true;

/**
 * Collection chain from `extension` up to the root collection that owns the
 * variables, e.g. `[local, regional, core]`.
 */
const getCollectionChain = (
  extension: VariableCollection,
  collectionsById: CollectionsById
) => {
  const chain = [extension];
  let current = extension;

  while (isExtendedCollection(current)) {
    const parentId = asExtension(current).parentVariableCollectionId;
    const parent = collectionsById.get(parentId);

    if (!parent) {
      throw new Error(
        `Collection "${current.name}" extends "${parentId}", which was not found`
      );
    }

    chain.push(parent);
    current = parent;
  }

  return chain;
};

/**
 * Extension modes get their own ids, so a mode is matched to the parent's mode
 * by name, falling back to its position.
 */
const getModeIdFor = (
  collection: VariableCollection,
  mode: VariableCollection['modes'][number],
  modeIndex: number
) =>
  (
    collection.modes.find((candidate) => candidate.name === mode.name) ??
    collection.modes[modeIndex]
  )?.modeId;

/**
 * Value of `variable` in every mode of `extension`. The closest override in
 * the chain wins and the root collection's own value is the fallback. A
 * `null` override means "cleared", so it falls through to the parent as well.
 */
export const resolveExtendedValuesByMode = (
  variable: Variable,
  extension: VariableCollection,
  collectionsById: CollectionsById
) => {
  const chain = getCollectionChain(extension, collectionsById);
  const root = chain[chain.length - 1];

  if (variable.variableCollectionId !== root.id) {
    throw new Error(
      `Variable "${variable.name}" is not part of the collection tree of "${extension.name}"`
    );
  }

  return Object.fromEntries(
    extension.modes.map((mode, modeIndex) => {
      for (const level of chain.slice(0, -1)) {
        const modeId = getModeIdFor(level, mode, modeIndex);
        const override =
          asExtension(level).variableOverrides?.[variable.id]?.[modeId];

        if (override !== undefined && override !== null) {
          return [mode.modeId, override];
        }
      }

      const rootModeId = getModeIdFor(root, mode, modeIndex);
      return [mode.modeId, variable.valuesByMode[rootModeId]];
    })
  );
};

/**
 * Resolver that names every alias into the root collection after `extension`.
 * An extension exports all of its variables, so inside it `{core.color.brand}`
 * has to point at the extension's own `color.brand`, not at the root's.
 */
export const createExtensionResolver = (
  resolver: IResolver,
  extension: VariableCollection
): IResolver => {
  const rootId = asExtension(extension).rootVariableCollectionId;

  return {
    getLocalEffectStyles: () => resolver.getLocalEffectStyles(),
    getLocalVariableCollections: () => resolver.getLocalVariableCollections(),
    getLocalVariables: () => resolver.getLocalVariables(),
    getLocalGridStyles: () => resolver.getLocalGridStyles(),
    getLocalTextStyles: () => resolver.getLocalTextStyles(),
    getLocalPaintStyles: () => resolver.getLocalPaintStyles(),
    getVariableById: (variableId) => resolver.getVariableById(variableId),
    getVariableCollectionById: (id) =>
      id === rootId
        ? Promise.resolve(extension)
        : resolver.getVariableCollectionById(id),
  };
};
