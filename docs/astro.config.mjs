// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://tokens-bruecke.github.io',
  base: '/figma-plugin',
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
            'plugin/output-and-profiles',
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
    }),
  ],
});
