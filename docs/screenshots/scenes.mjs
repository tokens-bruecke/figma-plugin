// Every screenshot in the docs, as a stored plugin config plus the clicks
// that bring the UI into the state to capture. Shared by the harness (which
// renders `profiles`) and capture.mjs (which runs `steps` and `crop`).
//
// crop: texts whose boxes, joined, form the region to keep. Without it the
// whole plugin window is captured.

const styles = (included) => ({
  text: { isIncluded: included.includes('text'), customName: 'Typography-styles' },
  effects: { isIncluded: included.includes('effects'), customName: 'Effect-styles' },
  grids: { isIncluded: false, customName: 'Grid-styles' },
  colors: { isIncluded: included.includes('colors'), customName: 'Color-styles' },
});

const servers = {
  jsonbin: { isEnabled: true, name: 'design.tokens', secretKey: '$2a$10$demoaccesskeyonly', id: '' },
  github: {
    isEnabled: true,
    token: 'github_pat_11ADEMO0demo0demo0demo',
    owner: 'acme',
    repo: 'design-tokens',
    branch: 'main',
    fileName: 'tokens/design.tokens.json',
    commitMessage: 'chore: update tokens',
  },
  githubPullRequest: {
    isEnabled: true,
    token: 'github_pat_11ADEMO0demo0demo0demo',
    owner: 'acme',
    repo: 'design-tokens',
    baseBranch: 'main',
    branch: 'tokens-update',
    fileName: 'tokens/design.tokens.json',
    commitMessage: '',
    prTitle: 'Update design tokens',
    prBody: '',
  },
  gitlab: {
    isEnabled: true,
    host: '',
    token: 'glpat-demo0demo0demo0demo',
    owner: 'acme/design',
    repo: 'design-tokens',
    branch: 'main',
    fileName: 'tokens/design.tokens.json',
    commitMessage: '',
  },
  customURL: {
    isEnabled: true,
    url: 'https://api.example.com/tokens',
    method: 'POST',
    headers: '{ "Authorization": "Bearer …" }',
  },
};

const profile = (overrides = {}) => ({
  profileName: 'Default profile',
  includedStyles: styles([]),
  ...overrides,
});

const only = (...ids) =>
  Object.fromEntries(ids.map((id) => [id, servers[id]]));

const serverScene = (id, label) => ({
  profiles: { default: profile({ servers: only(id) }) },
  steps: async (page) => {
    await page.getByText(label, { exact: true }).first().click();
  },
});

export const scenes = {
  // Hero and "Show output": settings next to the generated JSON
  overview: {
    profiles: {
      default: profile({
        includedStyles: styles(['text', 'effects']),
        servers: only('github'),
      }),
    },
    previewHeight: 640,
    steps: async (page) => {
      await page.getByText('Show output', { exact: true }).click();
    },
  },

  settings: {
    profiles: { default: profile({ includedStyles: styles(['text']) }) },
  },

  'add-styles-to': {
    profiles: {
      default: profile({ includedStyles: styles(['text', 'effects']) }),
    },
    steps: async (page) => {
      await page.getByText('Keep separate', { exact: true }).click();
    },
    crop: ['Include styles', 'Spacing', 'DTCG 2025.10 format'],
  },

  'advanced-settings': {
    profiles: { default: profile() },
    steps: async (page) => {
      await page.getByText('Advanced settings', { exact: true }).click();
    },
  },

  'rename-styles': {
    profiles: { default: profile({ includedStyles: styles(['text', 'effects']) }) },
    crop: ['Include styles', 'Color-styles'],
    // Frames of an animation: clear the name, then type a new one
    animate: async (page, frame) => {
      const input = page.locator('#style-text input, input#style-text').first();
      await frame(4);
      await input.click();
      await page.keyboard.press('End');
      await frame(3);
      for (let i = 0; i < 'Typography-styles'.length; i++) {
        await page.keyboard.press('Backspace');
        await frame(1);
      }
      for (const char of 'Text') {
        await page.keyboard.type(char);
        await frame(2);
      }
      await frame(12);
    },
  },

  'servers-menu': {
    profiles: { default: profile() },
    steps: async (page) => {
      await page.getByText('Push to server', { exact: true }).click();
    },
    crop: ['DTCG 2025.10 format', 'JSONBin', 'Custom URL', 'Download JSON'],
  },

  'server-added': {
    profiles: { default: profile({ servers: only('jsonbin') }) },
    crop: ['Advanced settings', 'Download JSON'],
  },

  jsonbin: serverScene('jsonbin', 'JSONBin'),
  github: serverScene('github', 'Github'),
  'github-pr': serverScene('githubPullRequest', 'Github PR'),
  gitlab: serverScene('gitlab', 'Gitlab'),
  'custom-url': serverScene('customURL', 'Custom URL'),

  profiles: {
    activeProfileId: 'web',
    profiles: {
      web: profile({ profileName: 'Web' }),
      ios: profile({ profileName: 'iOS', colorMode: 'rgba-object' }),
      android: profile({ profileName: 'Android', colorMode: 'hex' }),
    },
    steps: async (page) => {
      await page.getByText('Web', { exact: true }).first().click();
    },
    crop: ['Web', 'Android', 'Color mode'],
  },

  empty: {
    hasVariables: false,
    profiles: { default: profile() },
  },
};
