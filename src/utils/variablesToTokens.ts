import { normalizeValue } from "./normalizeValue";
import { normilizeType } from "./normilizeType";
import { getTokenKeyName } from "./getTokenKeyName";

import { groupObjectNamesIntoCategories } from "./groupObjectNamesIntoCategories";

// console.clear();

export const variablesToTokens = async (
  variables: Variable[],
  collections: VariableCollection[],
  JSONSettingsConfig: JSONSettingsConfigI
) => {
  const colorMode = JSONSettingsConfig.colorMode;
  const isDTCGForamt = JSONSettingsConfig.useDTCGKeys;
  const includeValueAliasString = JSONSettingsConfig.includeValueAliasString;
  const keyNames = getTokenKeyName(isDTCGForamt);

  // let mergedVariables = {};
  let emptyCollection = collections.map((collection) => {
    return {
      [collection.name]: {},
    };
  });

  // console.log("variables", variables);
  console.log("collections", collections);

  variables.forEach((variable) => {
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
    const modesAmount = Object.keys(modes).length;

    const getValue = (modeIndex: number) =>
      normalizeValue({
        variableType: variable.resolvedType,
        variableValue: variable.valuesByMode[Object.keys(modes)[modeIndex]],
        variableScope: variable.scopes,
        colorMode,
        isDTCGForamt,
        includeValueAliasString,
      });

    const defaultValue = getValue(
      Object.keys(modes).indexOf(collectionDefaultModeId)
    );

    // console.log("defaultValue", defaultValue);

    const modesValues = Object.fromEntries(
      Object.keys(modes).map((modeId, index) => {
        const modeName = collections
          .find((collection) => collection.id === collectionId)
          .modes.find((mode) => mode.modeId === modeId).name;
        return [modeName, getValue(index)];
      })
    );

    const filteredModesValues = modesAmount === 1 ? {} : modesValues;

    const variableObject = {
      [keyNames.type]: normilizeType(variable.resolvedType, variable.scopes),
      [keyNames.value]: defaultValue,
      [keyNames.description]: variable.description,
      // add scopes if true
      ...(JSONSettingsConfig.includeScopes && {
        scopes: variable.scopes,
      }),
      // add meta
      $extensions: {
        mode: filteredModesValues,
        figma: {
          variableId: variable.id,
          collection: collectionObject,
        },
      },
    } as PluginTokenI;

    // console.log("variableObject", variableObject);

    // place variable into collection
    emptyCollection = emptyCollection.map((collection) => {
      if (Object.keys(collection)[0] === collectionName) {
        collection[collectionName][variable.name] = variableObject;
      }
      return collection;
    });
  });

  console.log("emptyCollection", emptyCollection);

  const mergedVariables = emptyCollection.reduce((result, collection) => {
    return {
      ...result,
      ...collection,
    };
  }, {});

  return groupObjectNamesIntoCategories(mergedVariables);
};
