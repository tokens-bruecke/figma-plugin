import { IResolver } from '@common/resolver';

/**
 * Fields of a collection created with "Extend a variable collection" (see
 * `ExtendedVariableCollection` in the plugin typings). The rest of the code is
 * written against `VariableCollection`, and REST/snapshot data may leave some
 * of them out, so every field is optional here.
 */
type ExtensionFields = {
  isExtension?: boolean;
  parentVariableCollectionId?: string;
  rootVariableCollectionId?: string;
  variableOverrides?: Record<string, Record<string, any>>;
};

type CollectionMode = VariableCollection['modes'][number] & {
  parentModeId?: string;
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
 * Id of the mode in `parent` that `childModeId` of `child` inherits from.
 * Extension modes carry a `parentModeId`; when it is missing (or points at a
 * mode that no longer exists) the mode is matched by name, falling back to its
 * position.
 */
const getParentModeId = (
  child: VariableCollection,
  childModeId: string,
  parent: VariableCollection,
  modeIndex: number
) => {
  const childMode = child.modes.find((mode) => mode.modeId === childModeId) as
    | CollectionMode
    | undefined;
  const { parentModeId } = childMode ?? {};

  if (
    parentModeId &&
    parent.modes.some((mode) => mode.modeId === parentModeId)
  ) {
    return parentModeId;
  }

  return (
    parent.modes.find((mode) => mode.name === childMode?.name) ??
    parent.modes[modeIndex]
  )?.modeId;
};

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
      let modeId = mode.modeId;

      for (let level = 0; level < chain.length - 1; level++) {
        const override = asExtension(chain[level]).variableOverrides?.[
          variable.id
        ]?.[modeId];

        if (override !== undefined && override !== null) {
          return [mode.modeId, override];
        }

        modeId = getParentModeId(
          chain[level],
          modeId,
          chain[level + 1],
          modeIndex
        );
      }

      return [mode.modeId, variable.valuesByMode[modeId]];
    })
  );
};

/**
 * Values by mode of any variable as seen from inside `extension`: variables
 * of its root collection get the overrides of the chain, variables of other
 * collections keep their own values.
 */
export const createExtensionValuesByMode =
  (extension: VariableCollection, collectionsById: CollectionsById) =>
  (variable: Variable) =>
    variable.variableCollectionId ===
    asExtension(extension).rootVariableCollectionId
      ? resolveExtendedValuesByMode(variable, extension, collectionsById)
      : variable.valuesByMode;

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
