// The home page layout renders only the hero and the features from the
// frontmatter, so the "How to use" steps go after the features here
import { Layout as BaseLayout } from '@rspress/core/theme-original';
import { withBase } from '@rspress/core/runtime';

const plugin = 'https://www.figma.com/community/plugin/1254538877056388290';

function HowToUse() {
  return (
    <section className="tb-home rp-doc">
      <h2>How to use</h2>
      <ol>
        <li>
          Install the plugin from the <a href={plugin}>Figma Community</a>.
        </li>
        <li>
          Run the plugin in any Figma file and adjust the{' '}
          <a href={withBase('/plugin/settings')}>settings</a>.
        </li>
        <li>
          Download the JSON file or{' '}
          <a href={withBase('/plugin/push-to-server')}>push it to a server</a>,
          or try the converter first in the{' '}
          <a href={withBase('/playground')}>playground</a>.
        </li>
      </ol>
      <p>
        A file without variables opens on an empty screen, where you can{' '}
        <a href={withBase('/getting-started/export-and-import#import-json--variables')}>
          import tokens
        </a>{' '}
        or continue to export styles only.
      </p>
    </section>
  );
}

const Layout = () => <BaseLayout afterFeatures={<HowToUse />} />;

export { Layout };
export * from '@rspress/core/theme-original';
