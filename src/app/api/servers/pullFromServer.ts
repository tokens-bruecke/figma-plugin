import {
  GitCredentialsT,
  PullResultI,
  getPullSource,
  isGitServer,
  parseTokenFiles,
  pullTokens,
} from './pullFromGit';
import { SplitOptionsI } from '../../../common/transform/splitTokensIntoFiles';

// A pull from any server: the Git servers read the files a push wrote,
// JSONBin and a custom URL return the whole export in one document.

/** Where a pull reads from, e.g. `acme/tokens · main` or `bin 65f…` */
export const getServerPullSource = (
  server: ServerType,
  credentials: ServerSettingsI[ServerType]
): string => {
  if (isGitServer(server)) {
    return getPullSource(server, credentials as GitCredentialsT);
  }

  if (server === 'jsonbin') {
    const { id } = credentials as JsonbinCredentialsI;
    return id ? `bin ${id}` : 'no Bin ID yet';
  }

  const { url } = credentials as CustomURLCredentialsI;
  try {
    const { host, pathname } = new URL(url);
    return `${host}${pathname === '/' ? '' : pathname}`;
  } catch {
    return url;
  }
};

/** Reads a response body as JSON, naming the source when it isn't */
const readTokens = async (response: Response, path: string) =>
  parseTokenFiles([{ path, content: await response.text() }]);

export const pullFromJsonbin = async (credentials: JsonbinCredentialsI) => {
  const id = credentials.id?.trim();

  if (!id) {
    throw new Error(
      'The bin has no ID yet. Push to server once, or paste the Bin ID in the JSONBin settings.'
    );
  }

  const response = await fetch(`https://api.jsonbin.io/v3/b/${id}/latest`, {
    headers: {
      'X-Master-Key': credentials.secretKey,
      // The record itself, without the { record, metadata } envelope
      'X-Bin-Meta': 'false',
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      'JSONBin rejected the Master key. Check that it is complete and belongs to the account that owns the bin.'
    );
  }

  if (response.status === 404) {
    throw new Error(`There is no bin ${id}. Check the Bin ID.`);
  }

  if (!response.ok) {
    const message = await response
      .json()
      .then((data) => data?.message)
      .catch(() => '');
    throw new Error(
      `JSONBin answered ${response.status}${message ? `: ${message}` : ''}.`
    );
  }

  return readTokens(response, `bin ${id}`);
};

export const pullFromCustomURL = async (credentials: CustomURLCredentialsI) => {
  let headers: Record<string, string> = {};

  try {
    headers = credentials.headers?.trim()
      ? JSON.parse(credentials.headers)
      : {};
  } catch (error) {
    throw new Error(
      `The headers are not valid JSON (${error.message}). Use an object, e.g. {"Authorization": "Bearer …"}.`
    );
  }

  const source = getServerPullSource('customURL', credentials);
  let response: Response;

  try {
    response = await fetch(credentials.url, { method: 'GET', headers });
  } catch (error) {
    // fetch rejects when the server can't be reached, or CORS blocks it
    throw new Error(
      `Can't reach ${source} (${error.message}). Check the URL, your network, and that the server allows requests from Figma (CORS).`
    );
  }

  if (!response.ok) {
    throw new Error(
      `GET ${source} answered ${response.status}${
        response.statusText ? ` ${response.statusText}` : ''
      }. The URL needs to return the tokens as JSON for a GET request.`
    );
  }

  return readTokens(response, source);
};

/** Fetches the tokens of any server, for an import */
export const pullFromServer = async (
  server: ServerType,
  servers: ServerSettingsI,
  splitOptions: SplitOptionsI = {}
): Promise<PullResultI> => {
  if (isGitServer(server)) {
    return pullTokens(server, servers, splitOptions);
  }

  const credentials = servers[server];
  const files =
    server === 'jsonbin'
      ? await pullFromJsonbin(credentials as JsonbinCredentialsI)
      : await pullFromCustomURL(credentials as CustomURLCredentialsI);

  return { files, source: getServerPullSource(server, credentials) };
};
