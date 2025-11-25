import { normalizeValue } from './normalizeValue';
import { normilizeType } from './normilizeType';
import { getTokenKeyName } from './getTokenKeyName';

import { groupObjectNamesIntoCategories } from './groupObjectNamesIntoCategories';
import { IResolver } from '../resolver';

// console.clear();

export const variablesToTokens = async (
  variables: Variable[],
  collections: VariableCollection[],
  config: ExportSettingsI,
  resolver: IResolver
) => {
  const {
    colorMode,
    useDTCGKeys,
    includeValueStringKeyToAlias,
    includeFigmaMetaData,
  } = config;
  const keyNames = getTokenKeyName(useDTCGKeys);

  // let mergedVariables = {};
  let emptyCollection = collections.map((collection) => {
    return {
      [collection.name]: {},
    };
  });

  // console.log("variables", variables);
  // console.log("collections", collections);

  for (const variable of variables) {
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
          useDTCGKeys,
          includeValueStringKeyToAlias,
        },
        resolver
      );

    const defaultValue = await getValue(
      Object.keys(modes).indexOf(collectionDefaultModeId)
    );

    // console.log("defaultValue", defaultValue);

    const modesValues = Object.fromEntries(
      await Promise.all(
        Object.keys(modes).flatMap(async (modeId, index) => {
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
    );

    const filteredModesValues =
      Object.keys(modesValues).length === 1 ? {} : modesValues;

    const variableObject = {
      [keyNames.type]: normilizeType(variable.resolvedType, variable.scopes),
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

    // place variable into collection
    emptyCollection = emptyCollection.map((collection) => {
      if (Object.keys(collection)[0] === collectionName) {
        collection[collectionName][variable.name] = variableObject;
      }
      return collection;
    });
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
