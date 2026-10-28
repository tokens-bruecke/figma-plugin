/**
 * DTCG 2025.10 §5.1.1: `{`, `}` and `.` "MUST NOT be used anywhere in a token
 * or group name", because references use them. Figma allows them in
 * collection names ("1. Primitives"), so a collection group gets a name
 * without them; the meta keeps the original name.
 */
export const toTokenName = (name: string): string =>
  name.replace(/[.{}]/g, '-');
