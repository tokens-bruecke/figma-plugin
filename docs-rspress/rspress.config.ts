import path from 'node:path';
import { defineConfig } from '@rspress/core';

const repoRoot = path.join(__dirname, '..');
const repo = 'https://github.com/tokens-bruecke/figma-plugin';

const page = (text: string, link: string) => ({ text, link });

const sidebar = [
  {
    text: 'Getting started',
    items: [
      page('Introduction', '/'),
      page('Export and import', '/getting-started/export-and-import'),
      page('Playground', '/playground'),
    ],
  },
  {
    text: 'Figma plugin',
    items: [
      page('Settings', '/plugin/settings'),
      page('Advanced settings', '/plugin/advanced-settings'),
      page('Push to server', '/plugin/push-to-server'),
      page('Profiles', '/plugin/profiles'),
      page('Output and window', '/plugin/output'),
      page('Dev Mode', '/plugin/dev-mode'),
    ],
  },
  {
    text: 'CLI',
    items: [
      page('CLI overview', '/cli/overview'),
      page('Options and configuration', '/cli/options'),
      page('For AI agents', '/cli/ai-agents'),
    ],
  },
  { text: 'Library', items: [page('Use as a library', '/library')] },
  {
    text: 'Reference',
    items: [
      page('Token structure', '/reference/token-structure'),
      page('Aliases', '/reference/aliases'),
      page('Styles support', '/reference/styles'),
      page('Types and scopes', '/reference/types'),
    ],
  },
  {
    text: 'More',
    items: [
      page('Privacy and feedback', '/privacy'),
      page('Changelog', `${repo}/blob/main/CHANGELOG.md`),
    ],
  },
];

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  outDir: 'dist',
  base: '/',
  siteOrigin: 'https://tokensbruecke.com',
  title: 'TokensBrücke',
  description:
    'Export Figma variables and styles as DTCG design tokens — from the Figma plugin, the CLI or the library.',
  icon: '/favicon.svg',
  logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },
  logoText: 'TokensBrücke',
  globalStyles: path.join(__dirname, 'theme/custom.css'),

  // Anonymous page views, in a GoatCounter of their own, apart from the
  // plugin's events. count.js skips localhost, so local previews aren't counted
  head: [
    '<script data-goatcounter="https://tokens-bruecke-docs.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>',
    // Link previews. Rspress adds og:title, og:description and og:type per
    // page; the image is the same everywhere. docs/public/og.png is exported
    // from the "OG 1 — Headline" frame in the tokensbruecke 2.0 Figma file
    '<meta property="og:image" content="https://tokensbruecke.com/og.png">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="TokensBrücke: Figma variables, shipped as design tokens.">',
    '<meta property="og:site_name" content="TokensBrücke">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:image" content="https://tokensbruecke.com/og.png">',
  ],

  markdown: {
    // <Screenshot name="…" alt="…" /> works in every page without an import
    globalComponents: [path.join(__dirname, 'components/Screenshot.tsx')],
    link: { checkDeadLinks: true },
  },

  // llms.txt, llms-full.txt and a .md copy of every page, for AI agents
  llms: {
    llmsTxt: ({ sections, siteOrigin = '' }) =>
      [
        '# TokensBruecke',
        '',
        '> Figma plugin, CLI and library that export Figma variables and styles as DTCG 2025.10 design tokens JSON, and import tokens back into Figma variables.',
        '',
        '- The CLI runs as `npx tokens-bruecke@latest`. It reads the Figma REST API (Figma Enterprise plan) or a local snapshot passed with `--input`.',
        '- Use `--stdout --quiet` for pure JSON on stdout, and pass tokens through environment variables.',
        '- The library is `tokens-bruecke/api` (`fetchTokens`, `convertTokens`), with the same options as the CLI configuration file.',
        '- The npm package also ships an agent skill and JSON schemas for the config and the snapshot; see the optional links.',
        '',
        `- [Complete documentation](${siteOrigin}/llms-full.txt): every page in one file`,
        '',
        // Same groups and order as the sidebar
        ...(() => {
          const pages = new Map(
            sections
              .flatMap((section) => section.pages)
              .map((p) => [p.routePath.replace(/\/$/, '') || '/', p])
          );
          return sidebar.flatMap((group) => {
            const lines = group.items
              .map((item) => pages.get(item.link))
              .filter(
                (p) =>
                  p &&
                  p.routePath !== '/' &&
                  !p.routePath.startsWith('/privacy')
              )
              .map(
                (p) =>
                  `- [${p.title}](${p.link})${
                    p.description ? `: ${p.description}` : ''
                  }`
              );
            return lines.length ? [`## ${group.text}`, '', ...lines, ''] : [];
          });
        })(),
        '## Optional',
        '',
        `- [Agent skill](${repo}/blob/main/skills/tokens-bruecke/SKILL.md): CLI usage guide for agents: flags, auth, config, output layout, exit codes`,
        `- [Config file JSON schema](${repo}/blob/main/schemas/cli-options.schema.json)`,
        `- [Snapshot JSON schema](${repo}/blob/main/schemas/tokens-snapshot.schema.json): input contract for \`--input\``,
        `- [Changelog](${repo}/blob/main/CHANGELOG.md)`,
        '',
      ].join('\n'),
  },

  themeConfig: {
    socialLinks: [{ icon: 'github', mode: 'link', content: repo }],
    editLink: { docRepoBaseUrl: `${repo}/edit/main/docs-rspress/docs/` },
    lastUpdated: true,
    // "Copy Markdown" and "Open in ChatGPT / Claude" under each page title
    llmsUI: {},
    nav: [
      page('Docs', '/getting-started/export-and-import'),
      page('Playground', '/playground'),
      page('Changelog', `${repo}/blob/main/CHANGELOG.md`),
    ],
    sidebar: { '/': sidebar },
  },

  builderConfig: {
    // The playground runs the plugin's own converter from ../src in the browser
    resolve: {
      alias: {
        '@common': path.join(repoRoot, 'src/common'),
        '@cli': path.join(repoRoot, 'src/cli'),
        '@app': path.join(repoRoot, 'src/app'),
        '@root': repoRoot,
      },
    },
    // Screenshots stay in the Starlight site's folder, so `pnpm shots` there
    // still updates both
    output: {
      copy: [
        {
          from: path.join(repoRoot, 'docs/src/assets/screenshots'),
          to: 'screenshots',
        },
      ],
    },
  },
});
