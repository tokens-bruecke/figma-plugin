import { afterEach, describe, expect, it, vi } from 'vitest';

import { pushToJSONBin } from './pushToJSONBin';

const credentials = (id = ''): JsonbinCredentialsI => ({
  isEnabled: true,
  id,
  name: 'tokens',
  secretKey: 'jsonbin-test',
});

describe('pushToJSONBin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports the id of a new bin so the next push updates it', async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ metadata: { id: 'bin-1' } }), {
          status: 200,
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const onBinCreated = vi.fn();
    const toast = vi.fn();

    await pushToJSONBin(credentials(), {}, toast, onBinCreated);

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    expect(onBinCreated).toHaveBeenCalledWith('bin-1');
    expect(toast.mock.calls[0][0].message).toContain('bin-1');
  });

  it('updates an existing bin without creating one', async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ metadata: { parentId: 'bin-1' } }), {
          status: 200,
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const onBinCreated = vi.fn();

    await pushToJSONBin(credentials('bin-1'), {}, vi.fn(), onBinCreated);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.jsonbin.io/v3/b/bin-1'
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
    expect(onBinCreated).not.toHaveBeenCalled();
  });

  it('shows the status and the message JSONBin sends', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: 'Invalid X-Master-Key' }), {
            status: 401,
          })
      )
    );
    const toast = vi.fn();

    await pushToJSONBin(credentials(), {}, toast);

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Error pushing tokens to JSONBin: 401 Invalid X-Master-Key',
        options: { type: 'error' },
      })
    );
  });
});
