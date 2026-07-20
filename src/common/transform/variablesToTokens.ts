import { normalizeValue } from './normalizeValue';
import { normalizeType } from './normalizeType';
import { getTokenKeyName } from './getTokenKeyName';

import { groupObjectNamesIntoCategories } from './groupObjectNamesIntoCategories';
import { IResolver } from '@common/resolver';

// console.clear();

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
  } = config;
  const keyNames = getTokenKeyName(useDTCG);

  // Sort variables to match the order shown in Figma's Variables panel.
  // getLocalVariables() does not guarantee UI order; the authoritative
  // order is each collection's `variableIds` array.
  const variableOrder = new Map<string, number>();
  let orderIndex = 0;
  for (const collection of collections) {
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

  for (const variable of sortedVariables) {
    // console.log("variable", variable);
    // get collection object
    const collectionId = variable.variableCollectionId;
    const collectionName = collections.find(
      (collection) => collection.id === collectionId
    ).name;
    const collectionDefaultModeId = collections.find(
      (collection) => collection.id === collectionId
    ).defaultModeId;
    const collectionObject = {
      id: collectionId,
      name: collectionName,
      defaultModeId: collectionDefaultModeId,
    };

    // console.log("collectionObject", collectionObj
    // console.log("collection", collectionObject);

    // get values by mode
    const modes = variable.valuesByMode;

    const getValue = async (modeIndex: number) =>
      await normalizeValue(
        {
          variableType: variable.resolvedType,
          variableValue: variable.valuesByMode[Object.keys(modes)[modeIndex]],
          variableScope: variable.scopes,
          colorMode,
          useDTCG,
          includeValueStringKeyToAlias,
          usePercentageOpacity,
          omitCollectionNames,
        },
        resolver
      );

    const defaultValue = await getValue(
      Object.keys(modes).indexOf(collectionDefaultModeId)
    );

    // console.log("defaultValue", defaultValue);

    const modesValues = Object.fromEntries(
      (
        await Promise.all(
          Object.keys(modes).map(async (modeId, index) => {
            const modeName = collections
              .find((collection) => collection.id === collectionId)
              .modes.find((mode) => mode.modeId === modeId)?.name;

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

    const tokenType = normalizeType(
      variable.resolvedType,
      variable.scopes,
      usePercentageOpacity
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
