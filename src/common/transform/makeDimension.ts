export interface DimensionValueI {
  value: number;
  unit: 'px' | 'rem';
}

/**
 * Formats a pixel dimension according to the target format.
 * - DTCG 2025.10: `{ value: 6, unit: "px" }`
 * - Native (legacy): `"6px"`
 */
export const makeDimension = (
  value: number,
  useDTCG: boolean
): DimensionValueI | string => {
  if (useDTCG) {
    return { value, unit: 'px' };
  }
  return `${value}px`;
};
