// Rewrites relative links in the docs (`../dev-mode/`) to root-absolute
// ones (`/figma-plugin/plugin/dev-mode/`). The pages render the same, and
// the links keep working once llms-full.txt joins all pages into one file.

const DOCS_DIR = '/src/content/docs/';

export default function rehypeAbsoluteLinks({ base }) {
  const root = base.replace(/\/$/, '');

  return (tree, file) => {
    const index = file.path?.indexOf(DOCS_DIR) ?? -1;
    if (index < 0) return;

    const slug = file.path
      .slice(index + DOCS_DIR.length)
      .replace(/\.mdx?$/, '')
      .replace(/(^|\/)index$/, '');
    const pageUrl = `http://docs${root}/${slug ? `${slug}/` : ''}`;

    const visit = (node) => {
      const href = node.properties?.href;
      if (node.tagName === 'a' && typeof href === 'string' && /^\.\.?\//.test(href)) {
        const url = new URL(href, pageUrl);
        node.properties.href = url.pathname + url.hash;
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
