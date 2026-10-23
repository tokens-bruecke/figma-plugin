import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { IResolver } from '@common/resolver';
import { tokensToVariables } from './tokensToVariables';
import { variablesToTokens } from './variablesToTokens';

/**
 * Minimal in-memory stand-in for the parts of the Figma Plugin API the
 * import touches, so the multi-pass import can run under vitest.
 */
const createFakeFigma = () => {
  const collections: any[] = [];
  const variables: any[] = [];
  let nextId = 1;

  const createVariableCollection = (name: string) => {
    const collection = {
      id: `VariableCollectionId:${nextId++}`,
      name,
      modes: [{ modeId: `${nextId++}:0`, name: 'Mode 1' }],
      variableIds: [] as string[],
      get defaultModeId() {
        return this.modes[0].modeId;
      },
      renameMode(modeId: string, newName: string) {
        this.modes.find((m: any) => m.modeId === modeId).name = newName;
      },
      addMode(name: string) {
        this.modes.push({ modeId: `${nextId++}:0`, name });
      },
    };
    collections.push(collection);
    return collection;
  };

  const createVariable = (name: string, collection: any, type: string) => {
    const variable = {
      id: `VariableID:${nextId++}`,
      name,
      variableCollectionId: collection.id,
      resolvedType: type,
      valuesByMode: {} as Record<string, any>,
      scopes: ['ALL_SCOPES'],
      description: '',
      setValueForMode(modeId: string, value: any) {
        if (
          typeof value === 'string' &&
          value.startsWith('{') &&
          value.endsWith('}')
        ) {
          throw new Error('Expected a value, received an unresolved reference');
        }
        this.valuesByMode[modeId] = value;
      },
    };
    collection.variableIds.push(variable.id);
    variables.push(variable);
    return variable;
  };

  return {
    variables: {
      createVariableCollection,
      createVariable,
      getVariableCollectionByIdAsync: async (id: string) =>
        collections.find((c) => c.id === id) ?? null,
    },
    _collections: collections,
    _variables: variables,
  };
};

const resolver = {
  getLocalVariableCollections: async () => [],
  getLocalVariables: async () => [],
} as unknown as IResolver;

const composed = (base: any, opacity: any) => ({
  color: base,
  opacity,
});

const composedExpression = (base: any, opacity: any) => ({
  type: 'VARIABLE_EXPRESSION',
  expressionFunction: 'COMPOSE_COLOR',
  expressionArguments: [base, opacity],
});

const isComposedShape = (value: any) =>
  value?.type === 'VARIABLE_EXPRESSION' ||
  (typeof value === 'object' && value !== null && 'opacity' in value);

describe('tokensToVariables with composed colors', () => {
  let fake: ReturnType<typeof createFakeFigma>;

  beforeEach(() => {
    fake = createFakeFigma();
    vi.stubGlobal('figma', fake);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const byName = (name: string) => fake._variables.find((v) => v.name === name);
  const modeOf = (variable: any, modeName = 'Mode 1') =>
    fake._collections
      .find((c) => c.id === variable.variableCollectionId)
      .modes.find((m: any) => m.name === modeName).modeId;
  const valueOf = (name: string, modeName?: string) => {
    const variable = byName(name);
    return variable.valuesByMode[modeOf(variable, modeName)];
  };

  test('writes composed colors back as { color, opacity } values', async () => {
    const result = await tokensToVariables(
      {
        t1: {
          color: {
            black: { $type: 'color', $value: '#000000' },
            translucent: {
              $type: 'color',
              $value: {
                components: '{t1.color.black}',
                alpha: '{t1.opacity.0}',
              },
            },
            half: {
              $type: 'color',
              $value: { components: '{t1.color.black}', alpha: 0.5 },
            },
            literal: {
              $type: 'color',
              $value: {
                colorSpace: 'srgb',
                components: [1, 0, 0],
                alpha: '{t1.opacity.0}',
                hex: '#ff0000',
              },
            },
          },
          opacity: {
            '0': { $type: 'number', $value: 0, scopes: ['COLOR_OPACITY'] },
          },
        },
      },
      resolver
    );

    expect(result.errors).toEqual([]);
    expect(result.variablesCreated).toBe(5);

    const black = byName('color/black');
    const opacity = byName('opacity/0');
    const alias = (variable: any) => ({
      type: 'VARIABLE_ALIAS',
      id: variable.id,
    });

    expect(opacity.scopes).toEqual(['COLOR_OPACITY']);
    expect(valueOf('color/translucent')).toEqual(
      composed(alias(black), alias(opacity))
    );
    expect(valueOf('color/half')).toEqual(composed(alias(black), 50));
    expect(valueOf('color/literal')).toEqual(
      composed({ r: 1, g: 0, b: 0, a: 1 }, alias(opacity))
    );
  });

  test('resolves references to collections imported later, per mode', async () => {
    const result = await tokensToVariables(
      {
        theme: {
          surface: {
            $type: 'color',
            $value: { components: '{base.blue}', alpha: 0.5 },
            $extensions: {
              mode: {
                Light: { components: '{base.blue}', alpha: 0.5 },
                Dark: { components: '{base.blue}', alpha: '80%' },
              },
            },
          },
          plain: { $type: 'color', $value: '{base.blue}' },
        },
        base: {
          blue: { $type: 'color', $value: '#0000ff' },
        },
      },
      resolver
    );

    expect(result.errors).toEqual([]);

    const blue = byName('blue');
    const alias = { type: 'VARIABLE_ALIAS', id: blue.id };
    expect(valueOf('surface', 'Light')).toEqual(composed(alias, 50));
    expect(valueOf('surface', 'Dark')).toEqual(composed(alias, 80));
    expect(valueOf('plain', 'Light')).toEqual(alias);
  });

  test('reports references that cannot be resolved at all', async () => {
    const result = await tokensToVariables(
      {
        t1: {
          broken: {
            $type: 'color',
            $value: { components: '{missing.color}', alpha: 0.5 },
          },
          brokenPlain: { $type: 'color', $value: '{missing.color}' },
        },
      },
      resolver
    );

    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toMatch(
      /Alias reference not found for "t1\/broken"/
    );
    expect(result.errors[1]).toMatch(
      /Alias reference not found for "t1\/brokenPlain"/
    );
    expect(valueOf('broken')).toBeUndefined();
  });

  test('leaves composed colors untouched when the runtime rejects them', async () => {
    const original = fake.variables.createVariable;
    fake.variables.createVariable = (...args: any[]) => {
      const variable = original(...(args as [any, any, any]));
      const set = variable.setValueForMode.bind(variable);
      variable.setValueForMode = (modeId: string, value: any) => {
        if (isComposedShape(value)) {
          throw new Error('Composed color variable values are not supported');
        }
        set(modeId, value);
      };
      return variable;
    };

    const result = await tokensToVariables(
      {
        theme: {
          shadow: {
            $type: 'color',
            $value: { components: '{t1.gray}', alpha: '{t1.opacity4}' },
            $extensions: {
              mode: {
                light: { components: '{t1.gray}', alpha: '{t1.opacity4}' },
                dark: { components: '{t1.gray}', alpha: 0.5 },
              },
            },
          },
          plain: { $type: 'color', $value: '{t1.gray}' },
        },
        t1: {
          gray: { $type: 'color', $value: '#ff0000' },
          opacity4: { $type: 'dimension', $value: { value: 4, unit: 'px' } },
        },
      },
      resolver
    );

    // nothing is written for the rejected values, other tokens are fine
    expect(valueOf('shadow', 'light')).toBeUndefined();
    expect(valueOf('shadow', 'dark')).toBeUndefined();
    expect(valueOf('plain', 'light')).toEqual({
      type: 'VARIABLE_ALIAS',
      id: byName('gray').id,
    });
    // default value + light + dark
    expect(result.composedColorsRejected).toBe(3);
    expect(result.errors).toHaveLength(3);
    expect(result.errors[0]).toMatch(
      /^Skipped .*shadow.*: this Figma version cannot write color aliases with a separate opacity \(Composed color variable values are not supported\)\. Update Figma to the latest version and import again\. See https:\/\/github\.com\/figma\/plugin-typings\/issues\/375$/
    );
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/3 value\(s\) skipped/);
    expect(result.message).not.toMatch(/error\(s\)/);
  });

  test('falls back to the COMPOSE_COLOR expression on runtimes that only accept it', async () => {
    const original = fake.variables.createVariable;
    fake.variables.createVariable = (...args: any[]) => {
      const variable = original(...(args as [any, any, any]));
      const set = variable.setValueForMode.bind(variable);
      variable.setValueForMode = (modeId: string, value: any) => {
        if (isComposedShape(value) && value.type !== 'VARIABLE_EXPRESSION') {
          throw new Error('Property "newValue" failed validation');
        }
        set(modeId, value);
      };
      return variable;
    };

    const result = await tokensToVariables(
      {
        t1: {
          gray: { $type: 'color', $value: '#ff0000' },
          shadow: {
            $type: 'color',
            $value: { components: '{t1.gray}', alpha: 0.5 },
          },
        },
      },
      resolver
    );

    expect(valueOf('shadow')).toEqual(
      composedExpression({ type: 'VARIABLE_ALIAS', id: byName('gray').id }, 50)
    );
    expect(result.composedColorsRejected).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  test('detects composed colors that Figma drops without throwing', async () => {
    const original = fake.variables.createVariable;
    fake.variables.createVariable = (...args: any[]) => {
      const variable = original(...(args as [any, any, any]));
      const set = variable.setValueForMode.bind(variable);
      variable.setValueForMode = (modeId: string, value: any) => {
        if (isComposedShape(value)) {
          return; // silently ignored
        }
        set(modeId, value);
      };
      return variable;
    };

    const result = await tokensToVariables(
      {
        t1: {
          gray: { $type: 'color', $value: '#ff0000' },
          shadow: {
            $type: 'color',
            $value: { components: '{t1.gray}', alpha: 0.5 },
          },
        },
      },
      resolver
    );

    expect(valueOf('shadow')).toBeUndefined();
    expect(result.composedColorsRejected).toBe(1);
    expect(result.errors[0]).toMatch(
      /the value was ignored by setValueForMode/
    );
    expect(result.message).toMatch(/1 value\(s\) skipped/);
  });

  test('imports motion tokens as TIMING and EASING variables', async () => {
    const result = await tokensToVariables(
      {
        motion: {
          duration: {
            $type: 'duration',
            $value: { value: 300, unit: 'ms' },
            scopes: ['ALL_SCOPES'],
          },
          expanded: { $type: 'cubicBezier', $value: [0.42, 0, 1, 1] },
          named: {
            $type: 'string',
            $value: 'ease-in',
            $extensions: { figmaType: 'EASING' },
          },
          spring: {
            $type: 'string',
            $value: 'spring(bounce 0.35)',
            scopes: ['ALL_SCOPES'],
            $extensions: { figmaType: 'EASING' },
          },
          label: { $type: 'string', $value: 'hold' },
        },
      },
      resolver
    );

    expect(result.errors).toEqual([]);
    expect(byName('duration').resolvedType).toBe('TIMING');
    expect(byName('duration').scopes).toEqual(['ALL_SCOPES']); // untouched default
    expect(valueOf('duration')).toBe(0.3);
    expect(byName('expanded').resolvedType).toBe('EASING');
    expect(valueOf('expanded')).toEqual({ type: 'EASE_IN' });
    expect(valueOf('named')).toEqual({ type: 'EASE_IN' });
    expect(valueOf('spring')).toEqual({
      type: 'CUSTOM_SPRING',
      easingFunctionSpring: { bounce: 0.35 },
    });
    // Without the marker a plain string stays a string variable
    expect(byName('label').resolvedType).toBe('STRING');
    expect(valueOf('label')).toBe('hold');
  });

  test('imports fontFamily tokens as STRING variables scoped to FONT_FAMILY', async () => {
    const result = await tokensToVariables(
      {
        fonts: {
          heading: { $type: 'fontFamily', $value: 'Playfair Display' },
          body: {
            $type: 'fontFamily',
            $value: 'Inter',
            scopes: ['FONT_FAMILY', 'TEXT_CONTENT'],
          },
        },
      },
      resolver
    );

    expect(result.errors).toEqual([]);
    expect(byName('heading').resolvedType).toBe('STRING');
    expect(byName('heading').scopes).toEqual(['FONT_FAMILY']);
    expect(valueOf('heading')).toBe('Playfair Display');
    // Explicit scopes win over the default
    expect(byName('body').scopes).toEqual(['FONT_FAMILY', 'TEXT_CONTENT']);
  });

  test('imports fontWeight tokens scoped to FONT_WEIGHT', async () => {
    const result = await tokensToVariables(
      {
        weights: {
          regular: { $type: 'fontWeight', $value: 460 },
          bold: { $type: 'fontWeight', $value: 'Bold' },
        },
      },
      resolver
    );

    expect(result.errors).toEqual([]);
    expect(byName('regular').resolvedType).toBe('FLOAT');
    expect(byName('regular').scopes).toEqual(['FONT_WEIGHT']);
    expect(byName('bold').resolvedType).toBe('STRING');
    expect(byName('bold').scopes).toEqual(['FONT_WEIGHT']);
  });

  test('keeps the scopes of an existing variable when the token has none', async () => {
    const tokens = {
      fonts: { heading: { $type: 'fontFamily', $value: 'Inter' } },
    };
    await tokensToVariables(tokens, resolver);
    byName('heading').scopes = ['FONT_FAMILY', 'TEXT_CONTENT'];

    const existing = {
      getLocalVariableCollections: async () => fake._collections,
      getLocalVariables: async () => fake._variables,
    } as unknown as IResolver;
    const result = await tokensToVariables(tokens, existing);

    expect(result.errors).toEqual([]);
    expect(result.variablesUpdated).toBe(1);
    expect(byName('heading').scopes).toEqual(['FONT_FAMILY', 'TEXT_CONTENT']);
  });

  test('keeps the variable when the runtime rejects a scope', async () => {
    const original = fake.variables.createVariable;
    fake.variables.createVariable = (...args: any[]) => {
      const variable = original(...(args as [any, any, any]));
      Object.defineProperty(variable, 'scopes', {
        set() {
          throw new Error('Invalid enum value');
        },
        get() {
          return ['ALL_SCOPES'];
        },
      });
      return variable;
    };

    const result = await tokensToVariables(
      {
        t1: {
          opacity: {
            '0': { $type: 'number', $value: 0, scopes: ['COLOR_OPACITY'] },
          },
        },
      },
      resolver
    );

    expect(result.errors).toEqual([
      'Failed to set scopes for variable "opacity/0": Invalid enum value',
    ]);
    expect(valueOf('opacity/0')).toBe(0);
  });
});

describe('tokensToVariables references and existing variables', () => {
  let fake: ReturnType<typeof createFakeFigma>;

  beforeEach(() => {
    fake = createFakeFigma();
    vi.stubGlobal('figma', fake);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const byName = (name: string) => fake._variables.find((v) => v.name === name);
  const defaultValueOf = (name: string) => {
    const variable = byName(name);
    const collection = fake._collections.find(
      (c) => c.id === variable.variableCollectionId
    );
    return variable.valuesByMode[collection.defaultModeId];
  };

  // Resolver over whatever the fake Figma file holds
  const fileResolver = {
    getLocalVariableCollections: async () => fake._collections,
    getLocalVariables: async () => fake._variables,
  } as unknown as IResolver;

  test('resolves a reference to a variable with a dot in its name', async () => {
    const result = await tokensToVariables(
      {
        Core: {
          spacing: {
            '1.5': { $type: 'dimension', $value: { value: 6, unit: 'px' } },
          },
          gap: { $type: 'dimension', $value: '{Core.spacing.1.5}' },
        },
      },
      resolver
    );

    expect(result.errors).toEqual([]);
    expect(defaultValueOf('gap')).toEqual({
      type: 'VARIABLE_ALIAS',
      id: byName('spacing/1.5').id,
    });
  });

  test('imports groups named like the keys of the legacy format', async () => {
    const result = await tokensToVariables(
      {
        Core: {
          type: {
            body: { size: { $type: 'number', $value: 16 } },
          },
          value: { $type: 'string', $value: 'a' },
          description: { short: { $type: 'string', $value: 'b' } },
          scopes: { $type: 'boolean', $value: true },
        },
      },
      resolver
    );

    expect(result.errors).toEqual([]);
    expect(fake._variables.map((v) => v.name).sort()).toEqual([
      'description/short',
      'scopes',
      'type/body/size',
      'value',
    ]);
    expect(defaultValueOf('type/body/size')).toBe(16);
  });

  test('still reads tokens in the legacy format', async () => {
    const result = await tokensToVariables(
      {
        Core: {
          gap: { type: 'number', value: 8, description: 'Gap' },
        },
      },
      resolver
    );

    expect(result.errors).toEqual([]);
    expect(fake._variables.map((v) => v.name)).toEqual(['gap']);
    expect(byName('gap').description).toBe('Gap');
  });

  test('skips a token whose type does not fit the existing variable', async () => {
    const collection = fake.variables.createVariableCollection('Core');
    fake.variables.createVariable('size', collection, 'COLOR');

    const result = await tokensToVariables(
      {
        Core: {
          size: { $type: 'dimension', $value: { value: 4, unit: 'px' } },
          gap: { $type: 'dimension', $value: { value: 8, unit: 'px' } },
        },
      },
      fileResolver
    );

    expect(result.errors).toEqual([
      'Variable "size" is COLOR in Figma, but the token is FLOAT (dimension): skipped. Rename or delete the variable to import this token.',
    ]);
    expect(result.variablesUpdated).toBe(0);
    expect(defaultValueOf('gap')).toBe(8);
  });

  test('writes a font weight alias into an existing number variable', async () => {
    const collection = fake.variables.createVariableCollection('Core');
    fake.variables.createVariable('weight/bold', collection, 'FLOAT');
    fake.variables.createVariable('weight/heading', collection, 'FLOAT');

    const result = await tokensToVariables(
      {
        Core: {
          weight: {
            bold: { $type: 'fontWeight', $value: 700 },
            heading: { $type: 'fontWeight', $value: '{Core.weight.bold}' },
          },
        },
      },
      fileResolver
    );

    expect(result.errors).toEqual([]);
    expect(defaultValueOf('weight/heading')).toEqual({
      type: 'VARIABLE_ALIAS',
      id: byName('weight/bold').id,
    });
  });
});

describe('tokensToVariables opacity round trip', () => {
  let fake: ReturnType<typeof createFakeFigma>;

  beforeEach(() => {
    fake = createFakeFigma();
    vi.stubGlobal('figma', fake);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const byName = (name: string) => fake._variables.find((v) => v.name === name);
  const defaultValueOf = (name: string) => {
    const variable = byName(name);
    const collection = fake._collections.find(
      (c) => c.id === variable.variableCollectionId
    );
    return variable.valuesByMode[collection.defaultModeId];
  };

  const fileResolver = {
    getLocalVariableCollections: async () => fake._collections,
    getLocalVariables: async () => fake._variables,
  } as unknown as IResolver;

  const exportOpacity = (usePercentageOpacity: boolean) =>
    variablesToTokens(
      [
        {
          id: 'v1',
          name: 'opacity/half',
          resolvedType: 'FLOAT',
          scopes: ['OPACITY'],
          variableCollectionId: 'c1',
          valuesByMode: { m1: 50 },
          description: '',
          codeSyntax: {},
        },
      ] as unknown as Variable[],
      [
        {
          id: 'c1',
          name: 'Core',
          defaultModeId: 'm1',
          modes: [{ modeId: 'm1', name: 'Mode 1' }],
          variableIds: ['v1'],
        },
      ] as unknown as VariableCollection[],
      {
        colorMode: 'hex',
        useDTCG: true,
        includeScopes: false,
        includeValueStringKeyToAlias: false,
        includeFigmaMetaData: false,
        usePercentageOpacity,
        expandEasingPresets: true,
        omitCollectionNames: false,
      } as ExportSettingsI,
      {} as IResolver
    );

  test.each([false, true])(
    'recreates an opacity variable from the default export (percentage: %s)',
    async (usePercentageOpacity) => {
      const tokens = await exportOpacity(usePercentageOpacity);

      const result = await tokensToVariables(tokens, resolver);

      expect(result.errors).toEqual([]);
      expect(byName('opacity/half').resolvedType).toBe('FLOAT');
      expect(byName('opacity/half').scopes).toEqual(['OPACITY']);
      expect(defaultValueOf('opacity/half')).toBe(50);
    }
  );

  test.each([
    ['a fraction', { $type: 'number', $value: 0.5 }],
    ['a percentage', { $type: 'string', $value: '50%' }],
  ])(
    'writes %s without scopes into an existing opacity variable as percent',
    async (_, token) => {
      const collection = fake.variables.createVariableCollection('Core');
      const variable = fake.variables.createVariable(
        'opacity/half',
        collection,
        'FLOAT'
      );
      variable.scopes = ['OPACITY'];

      const result = await tokensToVariables(
        { Core: { opacity: { half: token } } },
        fileResolver
      );

      expect(result.errors).toEqual([]);
      expect(result.variablesUpdated).toBe(1);
      expect(defaultValueOf('opacity/half')).toBe(50);
    }
  );
});
