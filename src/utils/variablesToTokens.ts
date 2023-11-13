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

  console.log("variables", variables);

  variables.forEach((variable) => {
    console.log("variable", variable);
    // get collection object
    const collectionId = variable.variableCollectionId;
    const collectionName = collections.find(
      (collection) => collection.id === collectionId
    ).name;
    const collectionObject = {
      id: collectionId,
      name: collectionName,
    };

    // console.log("collection", collectionObject);

    // get values by mode
    const modes = variable.valuesByMode;
    const modesAmount = Object.keys(modes).length;

    const getValue = (modeIndex: number) =>
      normalizeValue({
        modeName: "",
        modesAmount: modesAmount,
        variableType: variable.resolvedType,
        variableValue: variable.valuesByMode[Object.keys(modes)[modeIndex]],
        colorMode,
        isDTCGForamt,
        includeValueAliasString,
      });

    const defaultValue = getValue(0);

    const modesValues = Object.fromEntries(
      Object.keys(modes).map((modeId, index) => {
        const modeName = collections
          .find((collection) => collection.id === collectionId)
          .modes.find((mode) => mode.modeId === modeId).name;
        return [modeName, getValue(index)];
      })
    );

    const variableObject = {
      [keyNames.type]: normilizeType(variable.resolvedType),
      [keyNames.value]: defaultValue,
      [keyNames.description]: variable.description,
      // add scopes if true
      ...(JSONSettingsConfig.includeScopes && {
        scopes: variable.scopes,
      }),
      // add meta
      $extensions: {
        variableId: variable.id,
        modes: modesValues,
        collection: collectionObject,
      },
    };

    console.log("variableObject", variableObject);

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

  console.log("mergedVariables", mergedVariables);

  // collections.forEach((collection) => {
  //   let modes = {};

  //   const collectionName = collection.name;
  //   const isScopesIncluded = JSONSettingsConfig.includeScopes;
  //   const modesAmount = collection.modes.length;

  //   const newTokens = variables.reduce((result, variable) => {
  //     const modeValues = variable.valuesByMode;

  //     console.log("modeValues", modeValues);

  //     result[variable.name] = {
  //       [keyNames.type]: normilizeType(variable.resolvedType),

  //       [keyNames.description]: variable.description,
  //     };

  //     return result;
  //   });

  //   console.log("newTokens", newTokens);

  //   // collection.modes.forEach((mode, index) => {
  //   //   const modeName = mode.name;

  //   //   const variablesPerMode = variables.reduce((result, variable) => {
  //   //     // console.log("variable", variable);
  //   //     // console.log("result", result);
  //   //     //   const variableModeId = Object.keys(variable.valuesByMode)[index];

  //   //     //   if (variableModeId === mode.modeId) {
  //   //     //     const normilisedVariable = normalizeValue({
  //   //     //       modeName,
  //   //     //       modesAmount,
  //   //     //       variableType: variable.resolvedType,
  //   //     //       variableValue: variable.valuesByMode[variableModeId],
  //   //     //       colorMode,
  //   //     //       isDTCGForamt,
  //   //     //       includeValueAliasString,
  //   //     //     });

  //   //     //     const variableObject = {
  //   //     //       [keyNames.type]: normilizeType(variable.resolvedType),
  //   //     //       [keyNames.value]: normilisedVariable,
  //   //     //       [keyNames.description]: variable.description,
  //   //     //       // add scopes if true
  //   //     //       ...(isScopesIncluded && {
  //   //     //         scopes: variable.scopes,
  //   //     //       }),
  //   //     //       // add meta
  //   //     //       $extensions: {
  //   //     //         variableId: variable.id,
  //   //     //       },
  //   //     //     } as PluginTokenI;

  //   //     //     result[variable.name] = variableObject;
  //   //     //   }

  //   //     return result;
  //   //   }, {});

  //   //   // check amount of modes and assign to "modes" or "modes[modeName]" variable
  //   //   if (modesAmount === 1) {
  //   //     Object.assign(modes, groupObjectNamesIntoCategories(variablesPerMode));
  //   //   } else {
  //   //     // modes[modeName] = groupObjectNamesIntoCategories(variablesPerMode);
  //   //   }
  //   // });

  //   // console.log("modes", modes);

  //   mergedVariables[collectionName] = modes;
  // });

  return mergedVariables;
};
