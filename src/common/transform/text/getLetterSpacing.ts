import { makeDimension } from '@common/transform/makeDimension';

export const getLetterSpacing = (
  letterSpacing: LetterSpacing,
  isDTCGFormat: boolean = false
) => {
  if (letterSpacing.unit === 'PIXELS') {
    return makeDimension(letterSpacing.value, isDTCGFormat);
  }

  if (letterSpacing.unit === 'PERCENT') {
    return `${letterSpacing.value}%`;
  }

  return letterSpacing;
};
