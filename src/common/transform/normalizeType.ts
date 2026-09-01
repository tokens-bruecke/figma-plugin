import { normalizeEasing } from './motion';

export const normalizeType = (
  type: VariableResolvedDataType,
  variableScopes: VariableScope[],
  usePercentageOpacity: boolean = false,
  // EASING variables resolve to `cubicBezier` or `string` depending on which
  // preset they hold, so the value is needed to pick the type.
  variableValue?: any,
  expandEasingPresets: boolean = true
) => {
  switch (type) {
    case 'COLOR':
      return 'color';
    case 'FLOAT':
      if (variableScopes.length === 1) {
        if (variableScopes[0] === 'FONT_WEIGHT') {
          return 'fontWeight';
        } else if (variableScopes[0] === 'OPACITY') {
          return usePercentageOpacity ? 'string' : 'number';
        }
      }
      return 'dimension';
    case 'STRING':
      if (variableScopes.length === 1) {
        if (variableScopes[0] === 'FONT_WEIGHT') {
          return 'fontWeight';
        }
      }
      return 'string';
    case 'BOOLEAN':
      return 'boolean';
    case 'TIMING':
      return 'duration';
    case 'EASING':
      return normalizeEasing(variableValue, expandEasingPresets).type;
    default:
      return 'string';
  }
};
