import { afterEach, describe, expect, it, vi } from 'vitest';

import { gitlabMergeRequest } from './gitlabMergeRequest';
import { pushToGitlab } from './pushToGitlab';

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status });

type RouteT = [string, RegExp, () => Response];

/** Answers each request by the first route whose method and URL match */
const stubFetch = (routes: RouteT[]) => {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method || 'GET';
    const route = routes.find(
      ([m, pattern]) => m === method && pattern.test(url)
    );
    return route ? route[2]() : json(404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const callsTo = (fetchMock: ReturnType<typeof stubFetch>, method: string) =>
  fetchMock.mock.calls.filter(([, init]) => (init?.method || 'GET') === method);

const bodyOf = (call: [string, RequestInit?]) =>
  JSON.parse(call[1]?.body as string);

const credentials: GitlabMergeRequestCredentialsI = {
  isEnabled: true,
  host: 'gitlab.acme.com',
  owner: 'acme/frontend',
  repo: 'tokens',
  baseBranch: 'main',
  branch: '',
  fileName: 'design.tokens.json',
  token: 'glpat-test',
  commitMessage: '',
};

const tokens = { color: { $type: 'color', $value: '#ff0000' } };

const api = 'https://gitlab.acme.com/api/v4/projects/acme%2Ffrontend%2Ftokens';

describe('gitlabMergeRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resets the branch onto the target branch and opens a merge request', async () => {
    const fetchMock = stubFetch([
      ['HEAD', /\/repository\/files\//, () => json(200)],
      ['POST', /\/repository\/commits$/, () => json(201, { id: 'abc' })],
      ['GET', /\/merge_requests\?/, () => json(200, [])],
      [
        'POST',
        /\/merge_requests$/,
        () => json(201, { web_url: 'https://gitlab.acme.com/mr/1' }),
      ],
    ]);
    const toast = vi.fn();

    await gitlabMergeRequest(
      { ...credentials, mergeRequestDescription: 'From Figma' },
      tokens,
      toast
    );

    // The files are looked up on the target branch, which the commit builds on
    expect(callsTo(fetchMock, 'HEAD')[0][0]).toBe(
      `${api}/repository/files/design.tokens.json?ref=main`
    );
    expect(bodyOf(callsTo(fetchMock, 'POST')[0])).toMatchObject({
      branch: 'tokens-bruecke/update-tokens',
      start_branch: 'main',
      force: true,
      commit_message: 'Update tokens',
      actions: [{ action: 'update', file_path: 'design.tokens.json' }],
    });

    const listUrl = new URL(callsTo(fetchMock, 'GET')[0][0]);
    expect(Object.fromEntries(listUrl.searchParams)).toEqual({
      source_branch: 'tokens-bruecke/update-tokens',
      target_branch: 'main',
      state: 'opened',
    });
    expect(bodyOf(callsTo(fetchMock, 'POST')[1])).toEqual({
      source_branch: 'tokens-bruecke/update-tokens',
      target_branch: 'main',
      title: 'chore(tokens): update tokens',
      description: 'From Figma',
    });
    expect(toast.mock.calls[0][0]).toMatchObject({
      title: 'GitLab: Merge request created',
      link: { url: 'https://gitlab.acme.com/mr/1' },
      options: { type: 'success' },
    });
  });

  it('updates the open merge request instead of opening another one', async () => {
    const fetchMock = stubFetch([
      ['HEAD', /\/repository\/files\//, () => json(404)],
      ['POST', /\/repository\/commits$/, () => json(201)],
      [
        'GET',
        /\/merge_requests\?/,
        () => json(200, [{ web_url: 'https://gitlab.acme.com/mr/7' }]),
      ],
    ]);
    const toast = vi.fn();

    await gitlabMergeRequest(
      { ...credentials, branch: 'design/tokens' },
      tokens,
      toast
    );

    const posts = callsTo(fetchMock, 'POST');
    expect(posts).toHaveLength(1);
    expect(bodyOf(posts[0])).toMatchObject({
      branch: 'design/tokens',
      actions: [{ action: 'create' }],
    });
    expect(toast.mock.calls[0][0]).toMatchObject({
      title: 'GitLab: Merge request updated',
      link: { url: 'https://gitlab.acme.com/mr/7' },
    });
  });

  it('reports the GitLab message and opens no merge request when the commit fails', async () => {
    const fetchMock = stubFetch([
      ['HEAD', /\/repository\/files\//, () => json(404)],
      [
        'POST',
        /\/repository\/commits$/,
        () => json(400, { message: 'Invalid start branch' }),
      ],
    ]);
    const toast = vi.fn();

    await gitlabMergeRequest(credentials, tokens, toast);

    expect(callsTo(fetchMock, 'GET')).toHaveLength(0);
    expect(toast.mock.calls[0][0]).toMatchObject({
      message: 'Error creating merge request: Invalid start branch.',
      options: { type: 'error' },
    });
  });

  it('reads validation errors that GitLab returns as an object', async () => {
    stubFetch([
      ['HEAD', /\/repository\/files\//, () => json(200)],
      ['POST', /\/repository\/commits$/, () => json(201)],
      ['GET', /\/merge_requests\?/, () => json(200, [])],
      [
        'POST',
        /\/merge_requests$/,
        () =>
          json(409, {
            message: ['Another open merge request already exists'],
          }),
      ],
    ]);
    const toast = vi.fn();

    await gitlabMergeRequest(credentials, tokens, toast);

    expect(toast.mock.calls[0][0].message).toBe(
      'Error creating merge request: Another open merge request already exists.'
    );
  });
});

describe('pushToGitlab', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('commits straight to the branch without resetting it', async () => {
    const fetchMock = stubFetch([
      ['HEAD', /\/repository\/files\//, () => json(200)],
      ['POST', /\/repository\/commits$/, () => json(201)],
    ]);
    const toast = vi.fn();

    await pushToGitlab(
      { ...credentials, branch: 'develop' } as GitlabCredentialsI,
      tokens,
      toast
    );

    expect(callsTo(fetchMock, 'HEAD')[0][0]).toMatch(/\?ref=develop$/);
    const body = bodyOf(callsTo(fetchMock, 'POST')[0]);
    expect(body.branch).toBe('develop');
    expect(body).not.toHaveProperty('start_branch');
    expect(body).not.toHaveProperty('force');
    expect(toast.mock.calls[0][0].options.type).toBe('success');
  });
});
