import { afterEach, describe, expect, it, vi } from 'vitest';

import { getGitlabProjectId, normalizeGitlabHost } from './gitlabProject';
import { pushToGitlab } from './pushToGitlab';

describe('normalizeGitlabHost', () => {
  it.each([
    ['gitlab.acme.com', 'gitlab.acme.com'],
    ['https://gitlab.acme.com', 'gitlab.acme.com'],
    ['HTTP://gitlab.acme.com/', 'gitlab.acme.com'],
    ['  gitlab.acme.com//  ', 'gitlab.acme.com'],
    ['', 'gitlab.com'],
    [undefined, 'gitlab.com'],
  ])('turns %j into %s', (host, expected) => {
    expect(normalizeGitlabHost(host)).toBe(expected);
  });
});

describe('getGitlabProjectId', () => {
  it.each([
    ['acme', 'tokens', 'acme%2Ftokens'],
    ['acme/design', 'tokens', 'acme%2Fdesign%2Ftokens'],
    ['acme%2Fdesign', 'tokens', 'acme%2Fdesign%2Ftokens'],
    ['/acme/design/', ' tokens ', 'acme%2Fdesign%2Ftokens'],
  ])('encodes %s + %s as %s', (owner, repo, expected) => {
    expect(getGitlabProjectId(owner, repo)).toBe(expected);
  });
});

describe('pushToGitlab', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the API of a self-hosted GitLab for a project in a subgroup', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) =>
      init.method === 'HEAD'
        ? new Response(null, { status: 404 })
        : new Response('{}', { status: 201 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const toast = vi.fn();

    await pushToGitlab(
      {
        isEnabled: true,
        host: 'https://gitlab.acme.com/',
        owner: 'acme/frontend',
        repo: 'design-system',
        branch: 'main',
        fileName: 'design.tokens.json',
        token: 'glpat-test',
      },
      { Core: {} },
      toast
    );

    const base =
      'https://gitlab.acme.com/api/v4/projects/acme%2Ffrontend%2Fdesign-system';
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${base}/repository/files/design.tokens.json?ref=main`,
      `${base}/repository/commits`,
    ]);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ options: { type: 'success' } })
    );
  });
});
