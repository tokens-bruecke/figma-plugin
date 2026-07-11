import { makeDimension } from '@common/transform/makeDimension';

export const getLineHeight = (
  lineHeight: LineHeight,
  isDTCGFormat: boolean = false
) => {
  if (lineHeight.unit === 'PIXELS') {
    const roundedValue = Math.round(lineHeight.value);
    return makeDimension(roundedValue, isDTCGFormat);
  }

  if (lineHeight.unit === 'PERCENT') {
    const roundedValue = Math.round(lineHeight.value);
    return `${roundedValue}%`;
  }

  if (lineHeight.unit === 'AUTO') {
    return 'auto';
  }

  return lineHeight;
};
