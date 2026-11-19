import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getServerPullSource,
  pullFromCustomURL,
  pullFromJsonbin,
  pullFromServer,
} from './pullFromServer';

const tokens = { Colors: { primary: { $type: 'color', $value: '#ff0000' } } };

const respond = (status: number, body: unknown) =>
  vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
      })
  );

const jsonbin = (id = 'bin-1'): JsonbinCredentialsI => ({
  isEnabled: true,
  id,
  name: 'tokens',
  secretKey: 'jsonbin-test',
});

const customURL = (headers = ''): CustomURLCredentialsI => ({
  isEnabled: true,
  url: 'https://api.acme.com/tokens',
  method: 'POST',
  headers,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('pullFromJsonbin', () => {
  it('reads the latest version of the bin without its metadata', async () => {
    const fetchMock = respond(200, tokens);
    vi.stubGlobal('fetch', fetchMock);

    await expect(pullFromJsonbin(jsonbin())).resolves.toEqual([
      { path: 'bin bin-1', tokens },
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.jsonbin.io/v3/b/bin-1/latest'
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      'X-Master-Key': 'jsonbin-test',
      'X-Bin-Meta': 'false',
    });
  });

  it('asks for a Bin ID before the first push', async () => {
    const fetchMock = respond(200, tokens);
    vi.stubGlobal('fetch', fetchMock);

    await expect(pullFromJsonbin(jsonbin(''))).rejects.toThrow(/no ID yet/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('names a missing bin and a rejected key', async () => {
    vi.stubGlobal('fetch', respond(404, { message: 'Bin not found' }));
    await expect(pullFromJsonbin(jsonbin())).rejects.toThrow(
      'There is no bin bin-1. Check the Bin ID.'
    );

    vi.stubGlobal('fetch', respond(401, { message: 'Invalid key' }));
    await expect(pullFromJsonbin(jsonbin())).rejects.toThrow(
      /rejected the Master key/
    );
  });
});

describe('pullFromCustomURL', () => {
  it('reads the tokens with GET and the saved headers', async () => {
    const fetchMock = respond(200, tokens);
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      pullFromCustomURL(customURL('{"Authorization": "Bearer test"}'))
    ).resolves.toEqual([{ path: 'api.acme.com/tokens', tokens }]);
    expect(fetchMock.mock.calls[0][1]).toEqual({
      method: 'GET',
      headers: { Authorization: 'Bearer test' },
    });
  });

  it('explains an endpoint that only accepts pushes', async () => {
    vi.stubGlobal('fetch', respond(405, ''));

    await expect(pullFromCustomURL(customURL())).rejects.toThrow(
      'GET api.acme.com/tokens answered 405. The URL needs to return the tokens as JSON for a GET request.'
    );
  });

  it('names an answer that is not JSON', async () => {
    vi.stubGlobal('fetch', respond(200, '<html>'));

    await expect(pullFromCustomURL(customURL())).rejects.toThrow(
      /^api\.acme\.com\/tokens is not valid JSON/
    );
  });

  it('refuses headers that are not JSON without a request', async () => {
    const fetchMock = respond(200, tokens);
    vi.stubGlobal('fetch', fetchMock);

    await expect(pullFromCustomURL(customURL('Bearer'))).rejects.toThrow(
      /headers are not valid JSON/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('pullFromServer', () => {
  it('returns one file and its source for JSONBin', async () => {
    vi.stubGlobal('fetch', respond(200, tokens));

    await expect(
      pullFromServer('jsonbin', { jsonbin: jsonbin() } as ServerSettingsI)
    ).resolves.toEqual({
      files: [{ path: 'bin bin-1', tokens }],
      source: 'bin bin-1',
    });
  });

  it('describes where each server pulls from', () => {
    expect(getServerPullSource('customURL', customURL())).toBe(
      'api.acme.com/tokens'
    );
    expect(
      getServerPullSource('customURL', {
        ...customURL(),
        url: 'https://acme.com/',
      })
    ).toBe('acme.com');
    expect(getServerPullSource('jsonbin', jsonbin(''))).toBe('no Bin ID yet');
  });
});
