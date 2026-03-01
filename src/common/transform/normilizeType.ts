export const normilizeType = (
  type: VariableResolvedDataType,
  variableScopes: VariableScope[],
  usePercentageOpacity: boolean = false
) => {
  switch (type) {
    case 'COLOR':
      return 'color';
    case 'FLOAT':
      if (variableScopes.length === 1) {
        if (variableScopes[0] === 'FONT_WEIGHT') {
          return 'string';
        } else if (variableScopes[0] === 'OPACITY') {
          return usePercentageOpacity ? 'dimension' : 'number';
        }
      }
      return 'dimension';
    case 'STRING':
      return 'string';
    case 'BOOLEAN':
      return 'boolean';
    default:
      return 'string';
  }
};
