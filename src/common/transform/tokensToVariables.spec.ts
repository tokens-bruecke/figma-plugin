import { describe, expect, test } from 'vitest';
import {
  getTokenScopes,
  getTokenType,
  isValidVariableScope,
  convertTokenValueToFigmaValue,
  mapTokenTypeToFigmaType,
} from './tokensToVariables';

describe('getTokenScopes', () => {
  test('returns scopes from standard format', () => {
    const token = { scopes: ['ALL_SCOPES'], value: '#fff', type: 'color' };
    expect(getTokenScopes(token)).toEqual(['ALL_SCOPES']);
  });

  test('returns undefined when no scopes key is present', () => {
    const token = { value: '#fff', type: 'color' };
    expect(getTokenScopes(token)).toBeUndefined();
  });

  test('returns undefined when scopes is not an array', () => {
    const token = { scopes: 'ALL_SCOPES', value: '#fff', type: 'color' };
    expect(getTokenScopes(token)).toBeUndefined();
  });

  test('returns empty array when scopes is an empty array', () => {
    const token = { scopes: [], value: '#fff', type: 'color' };
    expect(getTokenScopes(token)).toEqual([]);
  });

  test('does not read from $extensions.scopes (inconsistent with export)', () => {
    const token = {
      $extensions: { scopes: ['OPACITY'] },
      value: '#fff',
      type: 'color',
    };
    expect(getTokenScopes(token)).toBeUndefined();
  });
});

describe('isValidVariableScope', () => {
  test('returns true for valid scopes', () => {
    expect(isValidVariableScope('ALL_SCOPES')).toBe(true);
    expect(isValidVariableScope('OPACITY')).toBe(true);
    expect(isValidVariableScope('FONT_SIZE')).toBe(true);
    expect(isValidVariableScope('PARAGRAPH_INDENT')).toBe(true);
  });

  test('returns false for invalid scope strings', () => {
    expect(isValidVariableScope('INVALID_SCOPE')).toBe(false);
    expect(isValidVariableScope('')).toBe(false);
    expect(isValidVariableScope('all_scopes')).toBe(false); // case-sensitive
  });

  test('returns false for non-string values', () => {
    expect(isValidVariableScope(null)).toBe(false);
    expect(isValidVariableScope(undefined)).toBe(false);
    expect(isValidVariableScope(123)).toBe(false);
  });
});

describe('convertTokenValueToFigmaValue', () => {
  const emptyMap = new Map();

  describe('DTCG 2025.10 color objects', () => {
    test('converts srgb color object via hex fallback', () => {
      const value = {
        colorSpace: 'srgb',
        components: [1, 0, 0],
        alpha: 1,
        hex: '#ff0000',
      };
      expect(convertTokenValueToFigmaValue(value, 'color', emptyMap)).toEqual({
        r: 1,
        g: 0,
        b: 0,
        a: 1,
      });
    });

    test('converts hsl color object via hex fallback', () => {
      const value = {
        colorSpace: 'hsl',
        components: [0, 100, 50],
        alpha: 0.5,
        hex: '#ff000080',
      };
      const result = convertTokenValueToFigmaValue(
        value,
        'color',
        emptyMap
      ) as any;
      expect(result.r).toBe(1);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.a).toBeCloseTo(0.5, 2);
    });

    test('converts oklch color object via hex fallback', () => {
      const value = {
        colorSpace: 'oklch',
        components: [0.6279, 0.2577, 29.234],
        alpha: 1,
        hex: '#ff0000',
      };
      expect(convertTokenValueToFigmaValue(value, 'color', emptyMap)).toEqual({
        r: 1,
        g: 0,
        b: 0,
        a: 1,
      });
    });

    test('converts srgb color object without hex using components', () => {
      const value = {
        colorSpace: 'srgb',
        components: [0.2, 0.4, 0.6],
        alpha: 0.8,
      };
      expect(convertTokenValueToFigmaValue(value, 'color', emptyMap)).toEqual({
        r: 0.2,
        g: 0.4,
        b: 0.6,
        a: 0.8,
      });
    });

    test('throws for non-srgb color object without hex', () => {
      const value = { colorSpace: 'oklch', components: [0.6, 0.25, 29] };
      expect(() =>
        convertTokenValueToFigmaValue(value, 'color', emptyMap)
      ).toThrow(/oklch/);
    });
  });

  describe('legacy color formats', () => {
    test('converts hex string', () => {
      expect(
        convertTokenValueToFigmaValue('#ff0000', 'color', emptyMap)
      ).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    });

    test('passes through RGB object', () => {
      const rgb = { r: 0.1, g: 0.2, b: 0.3, a: 1 };
      expect(convertTokenValueToFigmaValue(rgb, 'color', emptyMap)).toBe(rgb);
    });
  });

  describe('dimensions', () => {
    test('converts DTCG dimension object', () => {
      expect(
        convertTokenValueToFigmaValue(
          { value: 6, unit: 'px' },
          'dimension',
          emptyMap
        )
      ).toBe(6);
    });

    test('converts legacy string dimension', () => {
      expect(convertTokenValueToFigmaValue('12px', 'dimension', emptyMap)).toBe(
        12
      );
    });
  });

  describe('fontWeight', () => {
    test('passes through numeric font weight', () => {
      expect(convertTokenValueToFigmaValue(400, 'fontWeight', emptyMap)).toBe(
        400
      );
    });

    test('converts numeric string font weight', () => {
      expect(convertTokenValueToFigmaValue('700', 'fontWeight', emptyMap)).toBe(
        700
      );
    });

    test('keeps named font weight as string', () => {
      expect(
        convertTokenValueToFigmaValue('Bold', 'fontWeight', emptyMap)
      ).toBe('Bold');
    });
  });

  describe('opacity', () => {
    test('converts percentage string to Figma 0-100 number', () => {
      expect(convertTokenValueToFigmaValue('50%', 'opacity', emptyMap)).toBe(
        50
      );
      expect(convertTokenValueToFigmaValue('12.5%', 'opacity', emptyMap)).toBe(
        12.5
      );
    });

    test('converts fraction (0-1) back to Figma percent', () => {
      expect(convertTokenValueToFigmaValue(0.5, 'opacity', emptyMap)).toBe(50);
      expect(convertTokenValueToFigmaValue(0.25, 'opacity', emptyMap)).toBe(25);
      expect(convertTokenValueToFigmaValue(1, 'opacity', emptyMap)).toBe(100);
      expect(convertTokenValueToFigmaValue(0, 'opacity', emptyMap)).toBe(0);
    });

    test('keeps values above 1 as-is (already percent)', () => {
      expect(convertTokenValueToFigmaValue(50, 'opacity', emptyMap)).toBe(50);
      expect(convertTokenValueToFigmaValue(100, 'opacity', emptyMap)).toBe(100);
    });

    test('converts numeric string fraction', () => {
      expect(convertTokenValueToFigmaValue('0.75', 'opacity', emptyMap)).toBe(
        75
      );
    });

    test('throws for non-numeric values', () => {
      expect(() =>
        convertTokenValueToFigmaValue('opaque', 'opacity', emptyMap)
      ).toThrow(/Unsupported opacity value/);
    });
  });

  describe('alias references', () => {
    test('strips DTCG .$value suffix from unresolved alias', () => {
      const result = convertTokenValueToFigmaValue(
        '{colors.primary.$value}',
        'color',
        emptyMap
      );
      // Unresolved: returned as-is for second pass
      expect(result).toBe('{colors.primary.$value}');
    });

    test('resolves alias with .$value suffix when variable exists', () => {
      const map = new Map([
        ['colors/primary', { id: 'VariableID:1:1' } as any],
      ]);
      expect(
        convertTokenValueToFigmaValue('{colors.primary.$value}', 'color', map)
      ).toEqual({ type: 'VARIABLE_ALIAS', id: 'VariableID:1:1' });
    });

    test('resolves alias with legacy .value suffix', () => {
      const map = new Map([
        ['colors/primary', { id: 'VariableID:1:1' } as any],
      ]);
      expect(
        convertTokenValueToFigmaValue('{colors.primary.value}', 'color', map)
      ).toEqual({ type: 'VARIABLE_ALIAS', id: 'VariableID:1:1' });
    });
  });
});

describe('mapTokenTypeToFigmaType', () => {
  test('maps standard types', () => {
    expect(mapTokenTypeToFigmaType('color')).toBe('COLOR');
    expect(mapTokenTypeToFigmaType('dimension')).toBe('FLOAT');
    expect(mapTokenTypeToFigmaType('number')).toBe('FLOAT');
    expect(mapTokenTypeToFigmaType('boolean')).toBe('BOOLEAN');
    expect(mapTokenTypeToFigmaType('string')).toBe('STRING');
  });

  test('maps fontWeight based on value', () => {
    expect(mapTokenTypeToFigmaType('fontWeight', 400)).toBe('FLOAT');
    expect(mapTokenTypeToFigmaType('fontWeight', '700')).toBe('FLOAT');
    expect(mapTokenTypeToFigmaType('fontWeight', 'Bold')).toBe('STRING');
  });

  test('maps opacity to FLOAT', () => {
    expect(mapTokenTypeToFigmaType('opacity')).toBe('FLOAT');
  });

  test('falls back to STRING for unknown types', () => {
    expect(mapTokenTypeToFigmaType('duration')).toBe('STRING');
  });
});

describe('getTokenType', () => {
  test('returns declared $type', () => {
    expect(getTokenType({ $type: 'color', $value: '#fff' })).toBe('color');
  });

  test('detects opacity via OPACITY scope with number type', () => {
    const token = { $type: 'number', $value: 0.5, scopes: ['OPACITY'] };
    expect(getTokenType(token)).toBe('opacity');
  });

  test('detects opacity via OPACITY scope with string type (percentage export)', () => {
    const token = { type: 'string', value: '50%', scopes: ['OPACITY'] };
    expect(getTokenType(token)).toBe('opacity');
  });

  test('detects opacity via figmaType FLOAT in strict DTCG export', () => {
    // Percentage opacity in strict DTCG: $type omitted, figmaType preserved
    const token = {
      $value: '50%',
      $extensions: { figmaType: 'FLOAT' },
    };
    expect(getTokenType(token)).toBe('opacity');
  });

  test('does not detect opacity when scope is not exclusively OPACITY', () => {
    const token = {
      $type: 'number',
      $value: 0.5,
      scopes: ['OPACITY', 'EFFECT_FLOAT'],
    };
    expect(getTokenType(token)).toBe('number');
  });

  test('respects explicit non-number type despite OPACITY scope', () => {
    const token = { $type: 'color', $value: '#fff', scopes: ['OPACITY'] };
    expect(getTokenType(token)).toBe('color');
  });
});
