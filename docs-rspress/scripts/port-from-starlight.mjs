// One-off port of the Starlight pages in ../docs to Rspress. Rerun it to pick
// up edits made to the Starlight pages while both sites exist:
//   node scripts/port-from-starlight.mjs
// The home page (docs/index.mdx) is written by hand and is not touched.
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, '../../docs/src/content/docs');
const to = join(here, '../docs');
const shots = join(here, '../../docs/src/assets/screenshots');

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  );

// Starlight serves every page with a trailing slash, so `../x/` on
// /plugin/settings/ means /plugin/x/. Rspress has no trailing slash, so turn
// relative links into absolute ones, which also keeps them right in llms-full.txt
const absolute = (href, slug) => {
  const url = new URL(href, `http://docs/${slug ? `${slug}/` : ''}`);
  return url.pathname.replace(/\/$/, '') + url.hash || '/';
};

const problems = [];

for (const file of walk(from)) {
  const rel = relative(from, file);
  if (rel === 'index.mdx') continue;
  const slug = rel.replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '');
  let text = readFileSync(file, 'utf8');

  text = text
    // Screenshot is a global component in Rspress, and Steps is not needed
    .replace(/^import Screenshot from .*\n\n?/m, '')
    .replace(
      /^import \{[^}]*\} from '@astrojs\/starlight\/components';\n\n?/m,
      ''
    )
    .replace(/^<\/?Steps>\n\n?/gm, '')
    // :::tip[Title] → :::tip Title, and Starlight's caution is Rspress' warning
    .replace(/^:::(\w+)\[(.+?)\]/gm, ':::$1 $2')
    .replace(/^:::caution/gm, ':::warning')
    // A broken link in the Starlight page
    .replace(
      'https://github.com/tokens-bruecke/figma-plugin/blob/main/../advanced-settings/',
      '../advanced-settings/'
    )
    .replace(
      /\]\((\.\.?\/[^)\s]*)\)/g,
      (_, href) => `](${absolute(href, slug)})`
    )
    .replace(
      /href="(\.\.?\/[^"]*)"/g,
      (_, href) => `href="${absolute(href, slug)}"`
    );

  for (const [, name] of text.matchAll(/<Screenshot name="([^"]+)"/g)) {
    for (const theme of ['light', 'dark']) {
      if (!existsSync(join(shots, `${name}-${theme}.webp`))) {
        problems.push(`${rel}: missing screenshot ${name}-${theme}.webp`);
      }
    }
  }

  const out = join(to, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  console.log(`ported ${rel}`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
