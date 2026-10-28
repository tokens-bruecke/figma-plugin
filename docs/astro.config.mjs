// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';

import rehypeAbsoluteLinks from './src/plugins/rehype-absolute-links.mjs';

const base = '/figma-plugin';

export default defineConfig({
  site: 'https://tokens-bruecke.github.io',
  base,
  markdown: {
    rehypePlugins: [[rehypeAbsoluteLinks, { base }]],
  },
  integrations: [
    starlight({
      title: 'TokensBrücke',
      description:
        'Export Figma variables and styles as DTCG design tokens — from the Figma plugin, the CLI or the library.',
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
      },
      favicon: '/favicon.svg',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/tokens-bruecke/figma-plugin',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/tokens-bruecke/figma-plugin/edit/main/docs/',
      },
      lastUpdated: true,
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'Introduction', link: '/' },
            'getting-started/export-and-import',
          ],
        },
        {
          label: 'Figma plugin',
          items: [
            'plugin/settings',
            'plugin/advanced-settings',
            'plugin/push-to-server',
            'plugin/profiles',
            'plugin/output',
            'plugin/dev-mode',
          ],
        },
        {
          label: 'CLI',
          items: ['cli/overview', 'cli/options', 'cli/ai-agents'],
        },
        { label: 'Library', items: ['library'] },
        {
          label: 'Reference',
          items: [
            'reference/token-structure',
            'reference/aliases',
            'reference/styles',
            'reference/types',
          ],
        },
        {
          label: 'More',
          items: [
            'privacy',
            {
              label: 'Changelog',
              link: 'https://github.com/tokens-bruecke/figma-plugin/blob/main/CHANGELOG.md',
              attrs: { target: '_blank' },
            },
          ],
        },
      ],
      // llms.txt, llms-full.txt and llms-small.txt for AI agents, built
      // from these pages
      plugins: [
        starlightLlmsTxt({
          projectName: 'TokensBruecke',
          description:
            'Figma plugin, CLI and library that export Figma variables and styles as DTCG 2025.10 design tokens JSON, and import tokens back into Figma variables.',
          details: [
            '- The CLI runs as `npx tokens-bruecke@latest`. It reads the Figma REST API (Figma Enterprise plan) or a local snapshot passed with `--input`.',
            '- Use `--stdout --quiet` for pure JSON on stdout, and pass tokens through environment variables.',
            '- The library is `tokens-bruecke/api` (`fetchTokens`, `convertTokens`), with the same options as the CLI configuration file.',
            '- The npm package also ships an agent skill and JSON schemas for the config and the snapshot; see the optional links.',
          ].join('\n'),
          customSets: [
            {
              label: 'Figma plugin',
              description: 'settings, push to server, profiles, Dev Mode, export and import',
              paths: ['getting-started/**', 'plugin/**'],
            },
            {
              label: 'CLI and library',
              description: 'running the export in CI, scripts and agents',
              paths: ['cli/**', 'library'],
            },
            {
              label: 'Reference',
              description: 'how variables, aliases, styles and types map to tokens',
              paths: ['reference/**'],
            },
          ],
          optionalLinks: [
            {
              label: 'Agent skill',
              url: 'https://github.com/tokens-bruecke/figma-plugin/blob/main/skills/tokens-bruecke/SKILL.md',
              description: 'CLI usage guide for agents: flags, auth, config, output layout, exit codes',
            },
            {
              label: 'Config file JSON schema',
              url: 'https://github.com/tokens-bruecke/figma-plugin/blob/main/schemas/cli-options.schema.json',
            },
            {
              label: 'Snapshot JSON schema',
              url: 'https://github.com/tokens-bruecke/figma-plugin/blob/main/schemas/tokens-snapshot.schema.json',
              description: 'input contract for `--input`',
            },
            {
              label: 'Changelog',
              url: 'https://github.com/tokens-bruecke/figma-plugin/blob/main/CHANGELOG.md',
            },
          ],
          // Same order as the sidebar
          promote: [
            'index',
            'getting-started/**',
            'plugin/settings',
            'plugin/advanced-settings',
            'plugin/push-to-server',
            'plugin/profiles',
            'plugin/output',
            'plugin/dev-mode',
            'cli/overview',
            'cli/options',
            'cli/ai-agents',
            'library',
            'reference/token-structure',
            'reference/aliases',
            'reference/styles',
            'reference/types',
          ],
          demote: ['privacy'],
          exclude: ['privacy'],
          // Screenshots come in a light and a dark copy and their content is
          // in the text; heading anchors are just noise
          customSelectors: { all: ['.screenshot', '.sl-anchor-link'] },
        }),
      ],
    }),
  ],
});
