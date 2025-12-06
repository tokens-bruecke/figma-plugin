declare global {
  /**
   * NON TOKEN TYPES
   *
   * There are all non token types that are used for token generation.
   */

  type BorderStyle =
    | 'solid'
    | 'dashed'
    | 'dotted'
    | 'double'
    | 'groove'
    | 'ridge'
    | 'outset'
    | 'inset'

  type TokenDescriptionType = string

  type TokenType =
    // simple token types
    | 'color'
    | 'dimension'
    | 'fontFamily'
    | 'fontWeight'
    | 'duration'
    | 'cubicBezier'
    | 'number'
    | 'shadow'
    | 'fontSize'
    | 'lineHeight'
    | 'letterSpacing'
    | 'strokeStyle'
    // composite token types
    | 'border'
    | 'transition'
    | 'gradient'
    | 'typography'
    // experemental token types
    | 'alias'
    | 'grid'
    | 'blur'
    // default JSON types
    | 'string'
    | 'boolean'
    | 'object'
    | 'array'
    | 'null'

  type DimensionStringType = string | number

  type DurationStringType = string

  type GradientTokenType = 'linear' | 'radial' | 'angular' | 'conic'

  /**
   * TOKEN TYPES
   *
   * There are all simple token types.
   */

  interface GenericTokenI {
    $type: TokenType
    $value: any
    $description?: string
    $extensions?: any
  }

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#color
   */

  interface ColorTokenI extends GenericTokenI {
    $type: 'color'
    $value: string | object
  }

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#dimension
   */

  interface DimensionTokenI extends GenericTokenI {
    $type: 'dimension'
    $value: DimensionStringType
  }

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#font-family
   */

  interface FontFamilyTokenI extends GenericTokenI {
    $type: 'fontFamily'
    $value: string | string[] // Single font name or array of font names
  }

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#font-weight
   */

  interface FontWeightTokenI extends GenericTokenI {
    $type: 'fontWeight'
    $value:
      | number
      | 'thin'
      | 'hairline'
      | 'extra-light'
      | 'ultra-light'
      | 'light'
      | 'normal'
      | 'regular'
      | 'book'
      | 'medium'
      | 'semi-bold'
      | 'demi-bold'
      | 'bold'
      | 'extra-bold'
      | 'ultra-bold'
      | 'black'
      | 'heavy'
      | 'extra-black'
      | 'ultra-black'
  }

  /**
   * Part of the composite token: https://design-tokens.github.io/community-group/format/#typography
   */

  interface FontSizeTokenI extends GenericTokenI {
    $type: 'fontSize'
    $value: DimensionStringType
  }

  /**
   * Part of the composite token: https://design-tokens.github.io/community-group/format/#typography
   */

  interface LineHeightTokenI extends GenericTokenI {
    $type: 'lineHeight'
    $value: DimensionStringType
  }

  /**
   * Part of the composite token: https://design-tokens.github.io/community-group/format/#typography
   */

  interface LetterSpacingTokenI extends GenericTokenI {
    $type: 'letterSpacing'
    $value: DimensionStringType
  }

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#duration
   */

  interface DurationTokenI extends GenericTokenI {
    $type: 'duration'
    $value: DurationStringType // Number followed by "ms" unit
  }

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#cubic-bezier
   */

  interface CubicBezierTokenI extends GenericTokenI {
    $type: 'cubicBezier'
    $value: [number, number, number, number] // Array containing four numbers
  }

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#number
   */

  interface NumberTokenI extends GenericTokenI {
    $type: 'number'
    $value: number
  }

  /**
   * COMPOSITE TOKENS
   *
   * Tokens that are consist of multiple simple tokens.
   */

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#stroke-style
   */

  type StrokeStyleTokenValueType =
    | BorderStyle
    | {
        dashArray: (string | number)[]
        lineCap: 'round' | 'butt' | 'square'
        lineJoin: 'round' | 'bevel' | 'miter'
        miterLimit: number
        dashOffset: number
      }

  interface StrokeStyleTokenI extends GenericTokenI {
    $type: 'strokeStyle'
    $value: StrokeStyleTokenValueType
  }

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#border
   */

  type BorderTokenValueType = {
    color: string
    width: string
    style: StrokeStyleTokenI
  }

  interface BorderTokenI extends GenericTokenI {
    $type: 'border'
    $value: BorderTokenValueType
  }

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#transition
   */

  type TransitionTokenValueType = {
    duration: DurationTokenI | string
    delay: DurationTokenI | string
    timingFunction: CubicBezierTokenI | string
  }

  interface TransitionTokenI extends GenericTokenI {
    $type: 'transition'
    $value: TransitionTokenValueType
  }

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#gradient
   */

  type GradientTokenStopI = {
    color: ColorTokenI | string
    position: string
  }

  type GradientTokenValueI = {
    type: GradientTokenType
    angle: string
    stops: GradientTokenStopI[]
  }

  interface GradientTokenI extends GenericTokenI {
    $type: 'gradient'
    $value: GradientTokenValueI
  }

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#shadow
   * Issue: https://github.com/design-tokens/community-group/issues/100
   */

  type ShadowTokenValueType = {
    inset: boolean // is still in discussion
    color: ColorTokenI | string
    offsetX: DimensionTokenI | string
    offsetY: DimensionTokenI | string
    blur: DimensionTokenI | string
    spread: DimensionTokenI | string
  }

  interface ShadowTokenI extends GenericTokenI {
    $type: 'shadow'
    $value: ShadowTokenValueType
  }

  /**
   * Documentation: https://design-tokens.github.io/community-group/format/#typography
   */

  type TypographyTokenValueType = {
    fontFamily: FontFamilyTokenI | string
    fontSize: FontSizeTokenI | string
    lineHeight: LineHeightTokenI | DimensionStringType
    letterSpacing: LetterSpacingTokenI | DimensionStringType
    fontWeight: FontWeightTokenI | DimensionStringType
  }

  interface TypographyTokenI extends GenericTokenI {
    $type: 'typography'
    $value: TypographyTokenValueType
  }

  /**
   * EXPEREMENTAL TOKEN TYPES
   *
   * There are all experemental token types. Which are not officially in the spec.
   */

  /**
   * Alias token propoasal
   * issue: https://github.com/design-tokens/community-group/issues/214
   */

  interface AliasTokenI extends GenericTokenI {
    $type: 'alias'
    $value: `{\${string}}` // Name of the token to alias
  }

  /**
   * Grid token propoasal
   */

  type GridTokenValueType = {
    columnCount?: number
    columnGap?: DimensionStringType
    columnWidth?: DimensionStringType
    columnMargin?: DimensionStringType
    rowCount?: number
    rowGap?: DimensionStringType
    rowHeight?: DimensionStringType
    rowMargin?: DimensionStringType
  }

  interface GridTokenI extends GenericTokenI {
    $type: 'grid'
    $value: GridTokenValueType
  }

  /**
   * Blur token propoasal
   */

  type BlurTokenValueType = {
    role: 'layer' | 'background'
    blur: DimensionStringType
  }

  interface BlurTokenI extends GenericTokenI {
    $type: 'blur'
    $value: BlurTokenValueType
  }
}

export {}
