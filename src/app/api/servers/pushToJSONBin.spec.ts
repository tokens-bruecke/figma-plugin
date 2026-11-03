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

  it('returns the id of a new bin so the next push updates it', async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ metadata: { id: 'bin-1' } }), {
          status: 200,
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const toast = vi.fn();

    const result = await pushToJSONBin(credentials(), {}, toast);

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    expect(result.metadata.id).toBe('bin-1');
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
    const toast = vi.fn();

    await pushToJSONBin(credentials('bin-1'), {}, toast);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.jsonbin.io/v3/b/bin-1'
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
    expect(toast.mock.calls[0][0].message).not.toContain('Created');
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
