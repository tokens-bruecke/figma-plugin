// Anonymous usage counters via GoatCounter's public pixel endpoint.
// Only fixed event names are sent: never token data, file names, URLs,
// or anything else read from the Figma plugin API.
const ENDPOINT = 'https://pavellaptev.goatcounter.com/count';

const isEnabled = () => process.env.NODE_ENV === 'production';

/**
 * @param path fixed event path, e.g. "/push/github"
 * @param event true for actions, false for a "plugin opened" pageview
 */
export const track = (path: string, event = true) => {
  if (!isEnabled()) return;

  try {
    const params = new URLSearchParams({
      p: path,
      rnd: String(Date.now()),
    });
    if (event) params.set('e', 'true');

    fetch(`${ENDPOINT}?${params}`, { mode: 'no-cors', keepalive: true }).catch(
      () => {}
    );
  } catch {
    // analytics must never break the plugin
  }
};
