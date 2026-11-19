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
  gitlabMergeRequest: {
    isEnabled: true,
    host: '',
    token: 'glpat-demo0demo0demo0demo',
    owner: 'acme/design',
    repo: 'design-tokens',
    baseBranch: 'main',
    branch: '',
    fileName: 'tokens/design.tokens.json',
    commitMessage: '',
    mergeRequestTitle: '',
    mergeRequestDescription: '',
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

  // Download JSON and the "…" that opens Download settings
  'download-button': {
    profiles: { default: profile({ servers: only('github') }) },
    crop: ['Download JSON'],
  },

  'download-settings': {
    profiles: { default: profile({ downloadFileName: 'brand.tokens' }) },
    steps: async (page) => {
      await page.getByRole('button', { name: 'Download settings' }).click();
    },
  },

  // A split export downloads a .zip, and the hint links to the split setting
  'download-settings-split': {
    profiles: { default: profile({ splitByCollection: true }) },
    steps: async (page) => {
      await page.getByRole('button', { name: 'Download settings' }).click();
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

  // Split by collection with one collection left out of Git pushes
  'collections-row': {
    profiles: {
      default: profile({
        splitByCollection: true,
        excludedCollections: ['Spacing'],
        servers: only('github'),
      }),
    },
    crop: ['Advanced settings', 'Download JSON'],
  },

  collections: {
    profiles: {
      default: profile({
        splitByCollection: true,
        excludedCollections: ['Spacing'],
        servers: only('github'),
      }),
    },
    steps: async (page) => {
      await page.getByText('Collections', { exact: true }).click();
    },
  },

  // Import mode with a GitHub server. The GitHub API is stubbed: the pull
  // lists three collection files
  'pull-from-git': {
    profiles: {
      default: profile({
        splitByCollection: true,
        servers: only('github'),
      }),
    },
    steps: async (page) => {
      const collections = ['Primitives', 'Semantic', 'Motion'];
      const cors = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
      };
      await page.route('https://api.github.com/**', (route) => {
        const url = route.request().url();
        const reply = (body) =>
          route.fulfill({
            status: 200,
            headers: cors,
            contentType: 'application/json',
            body: JSON.stringify(body),
          });

        if (route.request().method() === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: cors });
        }
        if (url.includes('/branches/')) {
          return reply({ commit: { commit: { tree: { sha: 'tree' } } } });
        }
        if (url.includes('/git/trees/')) {
          return reply({
            truncated: false,
            tree: collections.map((name) => ({
              path: `tokens/${name}.tokens.json`,
              type: 'blob',
              sha: name,
            })),
          });
        }
        const name = url.slice(url.lastIndexOf('/') + 1);
        return reply({
          encoding: 'base64',
          content: Buffer.from(JSON.stringify({ [name]: {} })).toString(
            'base64'
          ),
        });
      });
      await page.getByText('Import', { exact: true }).first().click();
      await page.getByRole('button', { name: 'Pull from GitHub' }).click();
      // Out of the icon, so its hover doesn't show
      await page.mouse.move(0, 0);
      await page.getByText(/^Import 3 files/).waitFor();
    },
  },

  jsonbin: serverScene('jsonbin', 'JSONBin'),
  github: serverScene('github', 'GitHub'),
  'github-pr': serverScene('githubPullRequest', 'GitHub PR'),
  gitlab: serverScene('gitlab', 'GitLab'),
  'gitlab-mr': serverScene('gitlabMergeRequest', 'GitLab MR'),
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
    crop: ['Web', 'Android', 'Profile settings…', 'Include styles'],
  },

  'share-profile': {
    activeProfileId: 'web',
    profiles: { web: profile({ profileName: 'Web' }) },
    steps: async (page) => {
      await page.getByText('Web', { exact: true }).first().click();
      await page.getByText('Profile settings…', { exact: true }).click();
    },
  },

  'shared-profiles': {
    activeProfileId: 'web',
    profiles: {
      web: profile({ profileName: 'Web' }),
      ios: profile({ profileName: 'iOS' }),
    },
    sharedProfiles: {
      'design-system': profile({ profileName: 'Design system', updatedAt: 1 }),
    },
    steps: async (page) => {
      await page.getByText('Web', { exact: true }).first().click();
    },
    crop: ['Web', 'Design system', 'Profile settings…', 'Include styles'],
  },

  // Has to be the same object in both places: a profile linked to a shared
  // one shows Update when their timestamps differ
  'shared-profile-detail': {
    activeProfileId: 'ds',
    profiles: {
      ds: profile({ profileName: 'Design system', sharedId: 'design-system', sharedUpdatedAt: 1 }),
    },
    sharedProfiles: {
      'design-system': profile({ profileName: 'Design system', updatedAt: 1 }),
    },
    steps: async (page) => {
      await page.getByText('Design system', { exact: true }).first().click();
      await page.getByText('Profile settings…', { exact: true }).click();
    },
  },

  'shared-profile-update': {
    activeProfileId: 'ds',
    profiles: {
      ds: profile({ profileName: 'Design system', sharedId: 'design-system', sharedUpdatedAt: 1 }),
    },
    sharedProfiles: {
      'design-system': profile({ profileName: 'Design system', updatedAt: 2 }),
    },
    crop: ['Design system', 'The shared profile changed in this file.', 'Show output'],
  },

  'dev-mode': {
    environment: { editorType: 'dev', mode: 'inspect', isVSCode: false },
    profiles: {
      default: profile({ includedStyles: styles(['text']), servers: only('github') }),
    },
  },

  'dev-mode-output': {
    environment: { editorType: 'dev', mode: 'inspect', isVSCode: false },
    profiles: { default: profile({ servers: only('github') }) },
    steps: async (page) => {
      await page.getByText('Show output', { exact: true }).click();
    },
  },

  empty: {
    hasVariables: false,
    profiles: { default: profile() },
  },

  'pull-servers-menu': {
    hasVariables: false,
    profiles: { default: profile() },
    steps: async (page) => {
      await page.getByText('Pull from server', { exact: true }).click();
    },
    crop: ['Pull from server', 'Custom URL', 'Import from JSON file'],
  },
};
