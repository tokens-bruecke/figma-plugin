// A small but realistic design system, so the code preview in the
// screenshots has something worth looking at.

type RGBA = { r: number; g: number; b: number; a: number };

const hex = (value: string, a = 1): RGBA => ({
  r: parseInt(value.slice(1, 3), 16) / 255,
  g: parseInt(value.slice(3, 5), 16) / 255,
  b: parseInt(value.slice(5, 7), 16) / 255,
  a,
});

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

const collections = [
  { id: 'C:core', name: 'Core', modes: [{ modeId: 'core', name: 'Value' }] },
  {
    id: 'C:theme',
    name: 'Theme',
    modes: [
      { modeId: 'light', name: 'Light' },
      { modeId: 'dark', name: 'Dark' },
    ],
  },
  { id: 'C:space', name: 'Spacing', modes: [{ modeId: 'space', name: 'Value' }] },
];

const variables: any[] = [];
const add = (
  collectionId: string,
  name: string,
  resolvedType: string,
  valuesByMode: Record<string, unknown>,
  scopes = ['ALL_SCOPES']
) => {
  const id = `V:${collectionId}:${name}`;
  variables.push({
    id,
    name,
    variableCollectionId: collectionId,
    resolvedType,
    description: '',
    scopes,
    remote: false,
    valuesByMode,
  });
  return id;
};

const palette: Record<string, string[]> = {
  gray: ['#ffffff', '#f5f5f5', '#e6e6e6', '#cccccc', '#999999', '#757575', '#4d4d4d', '#2c2c2c', '#1e1e1e', '#000000'],
  blue: ['#e5f4ff', '#bde3ff', '#80caff', '#3dadff', '#0d99ff', '#007be5', '#0768cf', '#004fa8', '#003c80', '#002a5c'],
  red: ['#ffe2e0', '#ffc7c2', '#ffa59c', '#ff7a6b', '#f24822', '#dc3412', '#bd2915', '#9c1e0d', '#7a1608', '#560f04'],
};

const core: Record<string, string> = {};
for (const [color, steps] of Object.entries(palette)) {
  steps.forEach((value, index) => {
    const step = index === 0 ? '0' : `${index * 10}`;
    core[`${color}/${step}`] = add('C:core', `color/${color}/${step}`, 'COLOR', { core: hex(value) });
  });
}

const theme = (name: string, light: string, dark: string) =>
  add('C:theme', name, 'COLOR', { light: alias(core[light]), dark: alias(core[dark]) });

theme('text/primary', 'gray/80', 'gray/0');
theme('text/secondary', 'gray/50', 'gray/40');
theme('surface/default', 'gray/0', 'gray/80');
theme('surface/raised', 'gray/10', 'gray/70');
theme('border/default', 'gray/20', 'gray/60');
theme('accent/default', 'blue/40', 'blue/30');
theme('accent/hover', 'blue/50', 'blue/20');
theme('danger/default', 'red/40', 'red/30');

[0, 2, 4, 8, 12, 16, 24, 32, 48].forEach((value) => {
  add('C:space', `space/${value}`, 'FLOAT', { space: value }, ['GAP', 'WIDTH_HEIGHT']);
});
[2, 4, 8, 16].forEach((value) => {
  add('C:space', `radius/${value}`, 'FLOAT', { space: value }, ['CORNER_RADIUS']);
});

export const demoSnapshot = {
  variableCollections: collections.map((collection) => ({
    ...collection,
    defaultModeId: collection.modes[0].modeId,
    variableIds: variables
      .filter((variable) => variable.variableCollectionId === collection.id)
      .map((variable) => variable.id),
  })),
  variables,
  paintStyles: [
    {
      id: 'S:brand',
      name: 'Brand/Primary',
      description: '',
      paints: [{ type: 'SOLID', color: { r: 0.05, g: 0.6, b: 1 }, opacity: 1 }],
      boundVariables: { paints: [alias(core['blue/40'])] },
    },
  ],
  textStyles: [
    ['Heading/H1', 'Bold', 700, 32, 40],
    ['Heading/H2', 'Semi Bold', 600, 24, 32],
    ['Body/Regular', 'Regular', 400, 14, 20],
  ].map(([name, style, fontWeight, fontSize, lineHeight]) => ({
    id: `S:${name}`,
    name,
    description: '',
    fontName: { family: 'Inter', style },
    fontSize,
    fontWeight,
    letterSpacing: { value: 0, unit: 'PIXELS' },
    lineHeight: { value: lineHeight, unit: 'PIXELS' },
    paragraphIndent: 0,
    paragraphSpacing: 0,
    textCase: 'ORIGINAL',
    textDecoration: 'NONE',
  })),
  effectStyles: [
    {
      id: 'S:shadow',
      name: 'Elevation/Card',
      description: '',
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.12 },
          offset: { x: 0, y: 4 },
          radius: 16,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL',
        },
      ],
    },
  ],
  gridStyles: [],
};
