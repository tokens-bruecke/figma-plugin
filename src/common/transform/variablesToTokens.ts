import { normalizeValue } from './normalizeValue';
import { normalizeType } from './normalizeType';
import { getTokenKeyName } from './getTokenKeyName';

import { groupObjectNamesIntoCategories } from './groupObjectNamesIntoCategories';
import { IResolver } from '@common/resolver';
import {
  createExtensionResolver,
  createExtensionValuesByMode,
  isExtendedCollection,
} from './extendedCollections';

// console.clear();

const MAX_ALIAS_DEPTH = 10;

/**
 * Follows a chain of variable aliases down to the concrete value behind it,
 * reading each target's default mode. Returns the value unchanged when it is
 * not an alias, or when the chain cannot be resolved. `valuesByModeOf` lets an
 * extended collection read its targets with its own overrides applied.
 */
const resolveAliasedValue = async (
  value: any,
  resolver: IResolver,
  valuesByModeOf: (variable: Variable) => Variable['valuesByMode'] = (
    variable
  ) => variable.valuesByMode,
  depth = 0
): Promise<any> => {
  if (value?.type !== 'VARIABLE_ALIAS' || depth >= MAX_ALIAS_DEPTH) {
    return value;
  }

  const target = await resolver.getVariableById(value.id);
  if (!target) {
    return value;
  }

  const collection = await resolver.getVariableCollectionById(
    target.variableCollectionId
  );
  const targetValuesByMode = valuesByModeOf(target);
  const modeId =
    collection?.defaultModeId ?? Object.keys(targetValuesByMode)[0];

  return resolveAliasedValue(
    targetValuesByMode[modeId],
    resolver,
    valuesByModeOf,
    depth + 1
  );
};

export const variablesToTokens = async (
  variables: Variable[],
  collections: VariableCollection[],
  config: ExportSettingsI,
  resolver: IResolver
) => {
  const {
    colorMode,
    useDTCG,
    includeValueStringKeyToAlias,
    includeFigmaMetaData,
    usePercentageOpacity,
    omitCollectionNames = false,
    expandEasingPresets = true,
  } = config;
  const keyNames = getTokenKeyName(useDTCG);

  // Sort variables to match the order shown in Figma's Variables panel.
  // getLocalVariables() does not guarantee UI order; the authoritative
  // order is each collection's `variableIds` array.
  const variableOrder = new Map<string, number>();
  let orderIndex = 0;
  for (const collection of collections) {
    // An extension lists the variables it inherits too, which would
    // otherwise reorder the variables of the collection that owns them.
    if (isExtendedCollection(collection)) {
      continue;
    }

    for (const variableId of collection.variableIds ?? []) {
      variableOrder.set(variableId, orderIndex++);
    }
  }
  const sortedVariables = [...variables].sort(
    (a, b) =>
      (variableOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (variableOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );

  // let mergedVariables = {};
  let emptyCollection = collections.map((collection) => {
    return {
      [collection.name]: {},
    };
  });

  // When omitting collection names, use a single flat object for all variables
  const flatVariables: Record<string, any> = {};
  const seenVariableNames = new Set<string>();

  // console.log("variables", variables);
  // console.log("collections", collections);

  const collectionsById = new Map(
    collections.map((collection) => [collection.id, collection])
  );
  const variablesById = new Map(
    variables.map((variable) => [variable.id, variable])
  );

  type VariableEntry = {
    variable: Variable;
    collection: VariableCollection;
    valuesByModeOf: (variable: Variable) => Variable['valuesByMode'];
    aliasResolver: IResolver;
  };

  const entries: VariableEntry[] = sortedVariables.map((variable) => ({
    variable,
    collection: collectionsById.get(variable.variableCollectionId),
    valuesByModeOf: (target) => target.valuesByMode,
    aliasResolver: resolver,
  }));

  // Variables are owned by the root collection, so extended collections
  // (e.g. a regional theme extending a core theme) export every inherited
  // variable again, with the overrides of their own chain applied.
  const extensions = collections.filter(isExtendedCollection);

  if (omitCollectionNames && extensions.length > 0) {
    console.warn(
      `[tokens-bruecke] Skipped ${extensions.length} extended collection(s): they repeat the variables of their root collection, which collide in a single namespace.`
    );
  } else {
    for (const extension of extensions) {
      const aliasResolver = createExtensionResolver(resolver, extension);
      const valuesByModeOf = createExtensionValuesByMode(
        extension,
        collectionsById
      );
      let missingVariables = 0;

      for (const variableId of extension.variableIds ?? []) {
        const variable = variablesById.get(variableId);
        if (!variable) {
          missingVariables++;
          continue;
        }

        entries.push({
          variable,
          collection: extension,
          valuesByModeOf,
          aliasResolver,
        });
      }

      // e.g. an extension of a library collection: the inherited variables
      // live in the library file, not in this one.
      if (missingVariables > 0) {
        console.warn(
          `[tokens-bruecke] Skipped ${missingVariables} variable(s) of extended collection "${extension.name}": they are not local to this file (is it extending a library collection?).`
        );
      }
    }
  }

  for (const entry of entries) {
    const { variable } = entry;

    try {
      await addVariable(entry);
    } catch (error) {
      // One variable the plugin cannot convert must not abort the whole
      // export: leave it out, say so, and keep going.
      console.warn(
        `[tokens-bruecke] Skipped variable "${variable.name}" (${
          variable.resolvedType
        }): ${error?.message ?? error}. Values: ${JSON.stringify(
          variable.valuesByMode
        )}`
      );
    }
  }

  async function addVariable({
    variable,
    collection,
    valuesByModeOf,
    aliasResolver,
  }: VariableEntry) {
    // console.log("variable", variable);
    if (!collection) {
      throw new Error(`Collection ${variable.variableCollectionId} not found`);
    }

    // get collection object
    const collectionId = collection.id;
    const collectionName = collection.name;
    const collectionDefaultModeId = collection.defaultModeId;
    const collectionObject = {
      id: collectionId,
      name: collectionName,
      defaultModeId: collectionDefaultModeId,
    };

    // console.log("collectionObject", collectionObj
    // console.log("collection", collectionObject);

    // get values by mode, in the collection's mode order: the key order of
    // valuesByMode is not guaranteed, so following it reorders the output
    const valuesByMode = valuesByModeOf(variable);
    const modes = valuesByMode;
    const modeOrder = collection.modes.map((mode) => mode.modeId);
    const modeRank = (modeId: string) => {
      const index = modeOrder.indexOf(modeId);
      return index === -1 ? modeOrder.length : index;
    };
    const modeIds = Object.keys(modes).sort(
      (a, b) => modeRank(a) - modeRank(b)
    );

    const getValue = async (modeIndex: number) =>
      await normalizeValue(
        {
          variableType: variable.resolvedType,
          variableValue: valuesByMode[modeIds[modeIndex]],
          variableScope: variable.scopes,
          colorMode,
          useDTCG,
          includeValueStringKeyToAlias,
          usePercentageOpacity,
          omitCollectionNames,
          expandEasingPresets,
        },
        aliasResolver
      );

    const defaultValue = await getValue(
      modeIds.indexOf(collectionDefaultModeId)
    );

    // console.log("defaultValue", defaultValue);

    const modesValues = Object.fromEntries(
      (
        await Promise.all(
          modeIds.map(async (modeId, index) => {
            const modeName = collection.modes.find(
              (mode) => mode.modeId === modeId
            )?.name;

            if (modeName) {
              return [[modeName, await getValue(index)]];
            }
            console.warn(`ModeId ${modeId} not found in ${collectionId}`);
            return [];
          })
        )
      ).flat()
    );

    const filteredModesValues =
      Object.keys(modesValues).length === 1 ? {} : modesValues;

    // EASING variables map to `cubicBezier` or `string` depending on the
    // preset they hold, so aliases have to be followed to their real value
    // before the token type can be decided.
    const rawDefaultValue =
      variable.resolvedType === 'EASING'
        ? await resolveAliasedValue(
            valuesByMode[collectionDefaultModeId],
            aliasResolver,
            valuesByModeOf
          )
        : valuesByMode[collectionDefaultModeId];

    const tokenType = normalizeType(
      variable.resolvedType,
      variable.scopes,
      usePercentageOpacity,
      rawDefaultValue,
      expandEasingPresets
    );

    const variableObject = {
      [keyNames.type]: tokenType,
      [keyNames.value]: defaultValue,
      [keyNames.description]: variable.description,
      // add scopes if true
      ...(config.includeScopes && {
        scopes: variable.scopes,
      }),
      // add meta
      $extensions: {
        mode: filteredModesValues,
        // Easings exported as names ("ease-in", "gentle", "hold") are plain
        // strings; the marker lets the import recreate an EASING variable.
        ...(variable.resolvedType === 'EASING' &&
          tokenType === 'string' && { figmaType: 'EASING' }),
        ...(includeFigmaMetaData && {
          figma: {
            codeSyntax: variable.codeSyntax,
            variableId: variable.id,
            collection: collectionObject,
          },
        }),
      },
    } as PluginTokenI;

    if (omitCollectionNames) {
      // Place variable into flat object; warn on collision
      if (seenVariableNames.has(variable.name)) {
        console.warn(
          `[tokens-bruecke] Collision: variable "${variable.name}" exists in multiple collections. Last value wins.`
        );
      }
      seenVariableNames.add(variable.name);
      flatVariables[variable.name] = variableObject;
    } else {
      // place variable into collection
      emptyCollection = emptyCollection.map((collection) => {
        if (Object.keys(collection)[0] === collectionName) {
          collection[collectionName][variable.name] = variableObject;
        }
        return collection;
      });
    }
  }

  if (omitCollectionNames) {
    return groupObjectNamesIntoCategories(flatVariables);
  }

  // console.log("emptyCollection", emptyCollection);

  const mergedVariables = emptyCollection.reduce((result, collection) => {
    return {
      ...result,
      ...collection,
    };
  }, {});

  return groupObjectNamesIntoCategories(mergedVariables);
};
