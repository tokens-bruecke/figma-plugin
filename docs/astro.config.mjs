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
      // Anonymous page views, in the same GoatCounter as the plugin's events.
      // count.js skips localhost, so local previews aren't counted
      head: [
        // Record /figma-plugin/… (the GitHub Pages path) as /docs/…, so the
        // docs read as docs next to the plugin's events. Must run before
        // count.js
        {
          tag: 'script',
          content:
            "window.goatcounter = { path: (p) => '/docs' + p.replace(/^\\/figma-plugin/, '') };",
        },
        {
          tag: 'script',
          attrs: {
            'data-goatcounter': 'https://tokens-bruecke.goatcounter.com/count',
            src: 'https://gc.zgo.at/count.js',
            async: true,
          },
        },
      ],
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
    }),
  ],
});
