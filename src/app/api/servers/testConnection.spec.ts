import { afterEach, describe, expect, it, vi } from 'vitest';

import { testConnection } from './testConnection';

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status });

/** Answers each request by the first route whose pattern matches its URL */
const stubFetch = (routes: [RegExp, () => Response][]) => {
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    const route = routes.find(([pattern]) => pattern.test(url));
    return route ? route[1]() : json(404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const github = {
  isEnabled: true,
  token: 'github_pat_test',
  owner: 'acme',
  repo: 'tokens',
  branch: 'main',
  fileName: 'design.tokens.json',
} as GithubCredentialsI;

const gitlab = {
  isEnabled: true,
  host: 'gitlab.acme.com',
  token: 'glpat-test',
  owner: 'acme/frontend',
  repo: 'tokens',
  branch: 'main',
  fileName: 'design.tokens.json',
} as GitlabCredentialsI;

describe('testConnection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('confirms a GitHub repository and branch the token can write to', async () => {
    const fetchMock = stubFetch([
      [/\/branches\/main$/, () => json(200, { name: 'main' })],
      [
        /\/repos\/acme\/tokens$/,
        () => json(200, { permissions: { push: true } }),
      ],
    ]);

    await expect(testConnection('github', github)).resolves.toEqual({
      ok: true,
      message: 'Connected to acme/tokens · main',
    });
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'Bearer github_pat_test',
    });
  });

  it('blames the token when GitHub rejects it', async () => {
    stubFetch([[/./, () => json(401)]]);

    await expect(testConnection('github', github)).resolves.toMatchObject({
      ok: false,
      fieldId: 'token',
    });
  });

  it('blames the repository when GitHub cannot find it', async () => {
    stubFetch([[/./, () => json(404)]]);

    await expect(testConnection('github', github)).resolves.toMatchObject({
      ok: false,
      fieldId: 'repository',
    });
  });

  it('blames the token when it can only read the repository', async () => {
    stubFetch([
      [
        /\/repos\/acme\/tokens$/,
        () => json(200, { permissions: { push: false } }),
      ],
    ]);

    await expect(testConnection('github', github)).resolves.toMatchObject({
      ok: false,
      fieldId: 'token',
      message: 'The token can read acme/tokens but not write to it.',
    });
  });

  it('checks the base branch of a GitHub pull request', async () => {
    const fetchMock = stubFetch([
      [/\/branches\/develop$/, () => json(404)],
      [
        /\/repos\/acme\/tokens$/,
        () => json(200, { permissions: { push: true } }),
      ],
    ]);

    await expect(
      testConnection('githubPullRequest', {
        ...github,
        branch: '',
        baseBranch: 'develop',
      } as GithubPullRequestCredentialsI)
    ).resolves.toMatchObject({ ok: false, fieldId: 'baseBranch' });
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/branches\/develop$/);
  });

  it('calls the API of a self-managed GitLab for a project in a subgroup', async () => {
    const fetchMock = stubFetch([
      [/\/repository\/branches\/main$/, () => json(200)],
      [/\/projects\/acme%2Ffrontend%2Ftokens$/, () => json(200)],
    ]);

    await expect(testConnection('gitlab', gitlab)).resolves.toEqual({
      ok: true,
      message: 'Connected to acme/frontend/tokens · main',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://gitlab.acme.com/api/v4/projects/acme%2Ffrontend%2Ftokens'
    );
  });

  it('blames the branch when the GitLab project has no such branch', async () => {
    stubFetch([
      [/\/repository\/branches\//, () => json(404)],
      [/\/projects\/[^/]+$/, () => json(200)],
    ]);

    await expect(testConnection('gitlab', gitlab)).resolves.toMatchObject({
      ok: false,
      fieldId: 'branch',
    });
  });

  it('points at the project when the GitLab host cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );

    await expect(testConnection('gitlab', gitlab)).resolves.toEqual({
      ok: false,
      fieldId: 'project',
      message:
        "Can't reach gitlab.acme.com. Check the address and your network.",
    });
  });
});
