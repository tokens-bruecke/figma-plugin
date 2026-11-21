// Runs after `rspress build`. Keeps the URLs of the old Starlight site
// working, because released versions of the plugin, the CLI and the npm
// package link to them:
//
// - Pages were /cli/options/ and are now /cli/options. Each old address gets
//   a copy of the page, marked with a canonical link to the new address.
//   A copy rather than a redirect page: GitHub Pages may answer /cli/options
//   with a redirect to the /cli/options/ folder, and a redirect page there
//   would send it straight back.
// - llms-small.txt and _llms-txt/*.txt came from starlight-llms-txt. They
//   are rebuilt here from the Markdown copy of each page, in sidebar order.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, '../dist');
const site = 'https://tokensbruecke.com';

const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

// ---------- /page/ → /page ----------

const pages = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.html')) pages.push(path.relative(dist, file));
  }
};
walk(dist);

let copies = 0;
for (const page of pages) {
  const route = page.replace(/\\/g, '/').replace(/\.html$/, '');
  if (route === 'index' || route === '404' || route.endsWith('/index')) continue;
  const copy = path.join(dist, route, 'index.html');
  if (fs.existsSync(copy)) continue;
  const html = fs.readFileSync(path.join(dist, page), 'utf8');
  const canonical = `<link rel="canonical" href="${site}/${route}">`;
  write(copy, html.replace('</head>', `${canonical}</head>`));
  copies++;
}

// ---------- llms-small.txt and _llms-txt/*.txt ----------

// llms.txt lists every page's Markdown copy under its sidebar group
const index = fs.readFileSync(path.join(dist, 'llms.txt'), 'utf8');
const groups = new Map();
let group = null;
for (const line of index.split('\n')) {
  const heading = line.match(/^## (.+)$/);
  if (heading) {
    group = heading[1].trim();
    groups.set(group, []);
    continue;
  }
  const link = line.match(/\]\((?:https?:\/\/[^/)]+)?(\/[^)\s]+\.md)\)/);
  if (group && link) groups.get(group).push(link[1]);
}

const section = (title, description, names) => {
  const links = names.flatMap((name) => groups.get(name) ?? []);
  if (!links.length) throw new Error(`No pages found for ${names.join(', ')} in llms.txt`);
  const body = links.map((link) => fs.readFileSync(path.join(dist, link), 'utf8').trim());
  return [`# TokensBruecke: ${title}`, '', `> ${description}`, '', ...body].join('\n\n') + '\n';
};

const sets = {
  'cli-and-library.txt': ['CLI and library', 'The CLI and library pages of the TokensBruecke documentation.', ['CLI', 'Library']],
  'figma-plugin.txt': ['Figma plugin', 'The Figma plugin pages of the TokensBruecke documentation.', ['Figma plugin']],
  'reference.txt': ['Reference', 'Token structure, aliases, styles, types and scopes.', ['Reference']],
};
for (const [file, [title, description, names]] of Object.entries(sets)) {
  write(path.join(dist, '_llms-txt', file), section(title, description, names));
}

// There is no shorter version any more; the full one is the closest match
fs.copyFileSync(path.join(dist, 'llms-full.txt'), path.join(dist, 'llms-small.txt'));

console.log(
  `legacy-urls: ${copies} old /page/ addresses, ${Object.keys(sets).length} _llms-txt files, llms-small.txt`
);
