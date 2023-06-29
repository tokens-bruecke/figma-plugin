/**
 * NON TOKEN TYPES
 *
 * There are all non token types that are used for token generation.
 */

type BorderStyle =
  | "solid"
  | "dashed"
  | "dotted"
  | "double"
  | "groove"
  | "ridge"
  | "outset"
  | "inset";

/** GLOBAL TYPES
 *
 * There are most generic types.
 */

interface GenericToken {
  $type: string;
  $value: string;
  $description?: string;
}

type tokenDescription = string;

type tokenType =
  | "color"
  | "dimension"
  | "fontFamily"
  | "fontWeight"
  | "duration"
  | "cubicBezier"
  | "number"
  | "shadow"
  | "alias"
  | "fontSize"
  | "lineHeight"
  | "letterSpacing"
  | "strokeStyle";

type dimensionStringType = string | number;

type durationStringType = string;

/**
 * TOKEN TYPES
 *
 * There are all simple token types.
 */

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#color
 */

type ColorToken = GenericToken & {
  $type: "color";
  $value: string; // Hex triplet/quartet including the preceding "#" character
};

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#dimension
 */

type DimensionToken = GenericToken & {
  $type: "dimension";
  $value: dimensionStringType;
};

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#font-family
 */

type FontFamilyToken = GenericToken & {
  $type: "fontFamily";
  $value: string | string[]; // Single font name or array of font names
};

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#font-weight
 */

type FontWeightToken = GenericToken & {
  $type: "fontWeight";
  $value:
    | number
    | "thin"
    | "hairline"
    | "extra-light"
    | "ultra-light"
    | "light"
    | "normal"
    | "regular"
    | "book"
    | "medium"
    | "semi-bold"
    | "demi-bold"
    | "bold"
    | "extra-bold"
    | "ultra-bold"
    | "black"
    | "heavy"
    | "extra-black"
    | "ultra-black";
};

/**
 * Part of the composite token: https://design-tokens.github.io/community-group/format/#typography
 */

type FontSizeToken = GenericToken & {
  $type: "fontSize";
  $value: dimensionStringType;
};

/**
 * Part of the composite token: https://design-tokens.github.io/community-group/format/#typography
 */

type LineHeightToken = GenericToken & {
  $type: "lineHeight";
  $value: dimensionStringType;
};

/**
 * Part of the composite token: https://design-tokens.github.io/community-group/format/#typography
 */

type LetterSpacingToken = GenericToken & {
  $type: "letterSpacing";
  $value: dimensionStringType;
};

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#duration
 */

type DurationToken = GenericToken & {
  $type: "duration";
  $value: durationStringType; // Number followed by "ms" unit
};

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#cubic-bezier
 */

type CubicBezierToken = GenericToken & {
  $type: "cubicBezier";
  $value: [number, number, number, number]; // Array containing four numbers
};

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#number
 */

type NumberToken = GenericToken & {
  $type: "number";
  $value: number;
};

/**
 * COMPOSITE TOKENS
 *
 * Tokens that are consist of multiple simple tokens.
 */

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#stroke-style
 */

interface StrokeStyleToken extends Omit<GenericToken, "$value"> {
  $type: "strokeStyle";
  $value:
    | BorderStyle
    | {
        dashArray: (string | number)[];
        lineCap: "round" | "butt" | "square";
        lineJoin: "round" | "bevel" | "miter";
        miterLimit: number;
        dashOffset: number;
      };
}

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#border
 */

interface BorderToken {
  $type: "border";
  $value: {
    color: string;
    width: string;
    style: StrokeStyleToken;
  };
}

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#transition
 */

interface TransitionToken {
  $type: "transition";
  $value: {
    duration: DurationToken | string;
    delay: DurationToken | string;
    timingFunction: CubicBezierToken | string;
  };
}

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#gradient
 */

interface GradientToken {
  $type: "gradient";
  $value: {
    type: "linear" | "radial" | "angular" | "conic";
    angle: number;
    stops: {
      position: number;
      color: ColorToken | string;
    }[];
  };
}

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#shadow
 */

interface ShadowToken extends Omit<GenericToken, "$value"> {
  $type: "shadow";
  $value: {
    color: ColorToken | string;
    offsetX: DimensionToken | string;
    offsetY: DimensionToken | string;
    blur: DimensionToken | string;
    spread: DimensionToken | string;
  };
}

/**
 * Documentation: https://design-tokens.github.io/community-group/format/#typography
 */

interface TypographyToken {
  $type: "typography";
  $value: {
    fontFamily: FontFamilyToken | string;
    fontSize: FontSizeToken | string;
    lineHeight: LineHeightToken | dimensionStringType;
    letterSpacing: LetterSpacingToken | dimensionStringType;
    fontWeight: FontWeightToken | dimensionStringType;
  };
}

/**
 * EXPEREMENTAL TOKEN TYPES
 *
 * There are all experemental token types. Which are not officially in the spec.
 *
 * issue: https://github.com/design-tokens/community-group/issues/214
 */

type AliasToken = GenericToken & {
  $type: "alias";
  $value: `{\${string}}`; // Name of the token to alias
};
