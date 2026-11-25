import { normalizeEasing } from './motion';
import { isFontWeightScope } from './fontWeightScopes';
import { isOpacityScope } from './opacityScopes';

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
      if (isFontWeightScope(variableScopes)) {
        return 'fontWeight';
      }
      if (isOpacityScope(variableScopes)) {
        return usePercentageOpacity ? 'string' : 'number';
      }
      return 'dimension';
    case 'STRING':
      if (isFontWeightScope(variableScopes)) {
        return 'fontWeight';
      }
      if (variableScopes.length === 1 && variableScopes[0] === 'FONT_FAMILY') {
        return 'fontFamily';
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
