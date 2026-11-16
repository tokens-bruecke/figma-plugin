import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  decodeBase64Utf8,
  getPullBranch,
  getPullSource,
  getPulledCollections,
  pullFromGithub,
  pullFromGitlab,
  pullTokens,
  selectTokenFiles,
} from './pullFromGit';

const json = (
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {}
) => new Response(JSON.stringify(body), { status, headers });

type RouteT = [RegExp, () => Response];

/** Answers each GET by the first route whose URL matches */
const stubFetch = (routes: RouteT[]) => {
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    const route = routes.find(([pattern]) => pattern.test(url));
    return route ? route[1]() : json(404, { message: 'Not Found' });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const base64 = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('selectTokenFiles', () => {
  const paths = [
    'README.md',
    'design.tokens.json',
    'tokens/old.json',
    'tokens/Primitives.tokens.json',
    'tokens/Theme/Light.tokens.json',
    'tokens/Theme/Dark.tokens.json',
    'tokens/Theme/notes.md',
    'tokens/a/b/Deep.tokens.json',
    'other/Primitives.tokens.json',
  ];

  it('reads the single file at the file path', () => {
    expect(selectTokenFiles(paths, {}, '')).toEqual(['design.tokens.json']);
    expect(selectTokenFiles(paths, {}, '/tokens/old.json')).toEqual([
      'tokens/old.json',
    ]);
  });

  it('reads the collection files of the folder', () => {
    expect(
      selectTokenFiles(paths, { splitByCollection: true }, 'tokens')
    ).toEqual(['tokens/Primitives.tokens.json']);
  });

  it('takes the folder of a file path saved from a single file export', () => {
    expect(
      selectTokenFiles(
        paths,
        { splitByCollection: true },
        'tokens/design.tokens.json'
      )
    ).toEqual(['tokens/Primitives.tokens.json']);
  });

  it('reads the mode files one folder down', () => {
    expect(selectTokenFiles(paths, { splitByMode: true }, 'tokens/')).toEqual([
      'tokens/Primitives.tokens.json',
      'tokens/Theme/Dark.tokens.json',
      'tokens/Theme/Light.tokens.json',
    ]);
  });

  it('leaves out excluded collections by their file name', () => {
    expect(
      selectTokenFiles(
        [...paths, 'tokens/1- Base.tokens.json'],
        { splitByMode: true, excludedCollections: ['Theme', '1. Base'] },
        'tokens'
      )
    ).toEqual(['tokens/Primitives.tokens.json']);
  });
});

describe('pull helpers', () => {
  const pr = {
    owner: 'acme',
    repo: 'tokens',
    branch: 'tokens-bruecke/update-tokens',
    baseBranch: 'main',
  } as GithubPullRequestCredentialsI;

  it('pulls a PR or MR server from the branch it merges into', () => {
    expect(getPullBranch('githubPullRequest', pr)).toBe('main');
    expect(
      getPullBranch('github', { ...pr, branch: 'dev' } as GithubCredentialsI)
    ).toBe('dev');
    expect(getPullSource('githubPullRequest', pr)).toBe('acme/tokens · main');
  });

  it('decodes base64 as UTF-8', () => {
    expect(decodeBase64Utf8(base64('{"Größe":"ü"}'))).toBe('{"Größe":"ü"}');
  });

  it('lists each collection once', () => {
    expect(
      getPulledCollections([
        { path: 'a', tokens: { Theme: {}, $extensions: {} } },
        { path: 'b', tokens: { Theme: {} } },
        { path: 'c', tokens: { Primitives: {} } },
      ])
    ).toEqual(['Theme', 'Primitives']);
  });
});

describe('pullFromGithub', () => {
  const credentials: GithubCredentialsI = {
    isEnabled: true,
    token: 'ghp_test',
    owner: 'acme',
    repo: 'tokens',
    branch: 'feature/tokens',
    fileName: 'tokens',
  };

  const branchRoute: RouteT = [
    /\/repos\/acme\/tokens\/branches\/feature%2Ftokens$/,
    () => json(200, { commit: { commit: { tree: { sha: 'tree1' } } } }),
  ];

  it('reads the files of the branch tree', async () => {
    const fetchMock = stubFetch([
      branchRoute,
      [
        /\/git\/trees\/tree1\?recursive=1$/,
        () =>
          json(200, {
            truncated: false,
            tree: [
              { path: 'tokens', type: 'tree', sha: 't' },
              { path: 'tokens/Größen.tokens.json', type: 'blob', sha: 'b1' },
              { path: 'tokens/readme.md', type: 'blob', sha: 'b2' },
            ],
          }),
      ],
      [
        /\/git\/blobs\/b1$/,
        () =>
          json(200, {
            encoding: 'base64',
            content: base64('{"Größen":{"s":{"$value":1}}}'),
          }),
      ],
    ]);

    const files = await pullFromGithub(credentials, credentials.branch, {
      splitByCollection: true,
    });

    expect(files).toEqual([
      {
        path: 'tokens/Größen.tokens.json',
        tokens: { Größen: { s: { $value: 1 } } },
      },
    ]);
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'Bearer ghp_test',
    });
  });

  it('names a missing branch', async () => {
    stubFetch([]);

    await expect(
      pullFromGithub(credentials, credentials.branch)
    ).rejects.toThrow('Could not find "feature/tokens" in acme/tokens');
  });

  it('names a rejected token', async () => {
    stubFetch([[/\/branches\//, () => json(401)]]);

    await expect(
      pullFromGithub(credentials, credentials.branch)
    ).rejects.toThrow('GitHub rejected the token');
  });

  it('refuses a truncated tree', async () => {
    stubFetch([
      branchRoute,
      [/\/git\/trees\//, () => json(200, { truncated: true, tree: [] })],
    ]);

    await expect(
      pullFromGithub(credentials, credentials.branch, { splitByMode: true })
    ).rejects.toThrow('too many files');
  });

  it('says when there are no token files', async () => {
    stubFetch([
      branchRoute,
      [/\/git\/trees\//, () => json(200, { truncated: false, tree: [] })],
    ]);

    await expect(
      pullFromGithub(credentials, credentials.branch, { splitByMode: true })
    ).rejects.toThrow('There are no .tokens.json files in "tokens"');
  });

  it('names a file that is not JSON', async () => {
    stubFetch([
      branchRoute,
      [
        /\/git\/trees\//,
        () =>
          json(200, {
            tree: [{ path: 'tokens/A.tokens.json', type: 'blob', sha: 'b1' }],
          }),
      ],
      [
        /\/git\/blobs\/b1$/,
        () => json(200, { encoding: 'base64', content: base64('{oops') }),
      ],
    ]);

    await expect(
      pullFromGithub(credentials, credentials.branch, {
        splitByCollection: true,
      })
    ).rejects.toThrow('tokens/A.tokens.json is not valid JSON');
  });
});

describe('pullFromGitlab', () => {
  const credentials: GitlabMergeRequestCredentialsI = {
    isEnabled: true,
    host: 'gitlab.acme.com',
    owner: 'acme/frontend',
    repo: 'tokens',
    baseBranch: 'main',
    branch: '',
    fileName: 'tokens',
    token: 'glpat-test',
  };
  const project =
    'https://gitlab.acme.com/api/v4/projects/acme%2Ffrontend%2Ftokens';

  it('follows the pages of the tree and reads the raw files', async () => {
    const fetchMock = stubFetch([
      [
        /\/repository\/tree\?.*page=1(&|$)/,
        () =>
          json(
            200,
            [{ path: 'tokens/Theme/Light.tokens.json', type: 'blob' }],
            { 'x-next-page': '2' }
          ),
      ],
      [
        /\/repository\/tree\?.*page=2(&|$)/,
        () =>
          json(200, [
            { path: 'tokens/Theme', type: 'tree' },
            { path: 'tokens/Theme/Dark.tokens.json', type: 'blob' },
          ]),
      ],
      [
        /\/repository\/files\/tokens%2FTheme%2FLight\.tokens\.json\/raw\?ref=main$/,
        () => new Response('{"Theme":{"bg":{"$value":1}}}'),
      ],
      [
        /\/repository\/files\/tokens%2FTheme%2FDark\.tokens\.json\/raw\?ref=main$/,
        () => new Response('{"Theme":{"bg":{"$value":2}}}'),
      ],
    ]);

    const result = await pullTokens(
      'gitlabMergeRequest',
      { gitlabMergeRequest: credentials } as ServerSettingsI,
      { splitByMode: true }
    );

    expect(result.source).toBe('acme/frontend/tokens · main');
    expect(result.files.map((file) => file.path)).toEqual([
      'tokens/Theme/Dark.tokens.json',
      'tokens/Theme/Light.tokens.json',
    ]);
    expect(result.files[0].tokens.Theme.bg.$value).toBe(2);

    const [firstUrl, init] = fetchMock.mock.calls[0];
    expect(firstUrl.startsWith(`${project}/repository/tree?`)).toBe(true);
    expect(new URL(firstUrl).searchParams.get('path')).toBe('tokens');
    expect(new URL(firstUrl).searchParams.get('ref')).toBe('main');
    expect(init?.headers).toMatchObject({ 'PRIVATE-TOKEN': 'glpat-test' });
  });

  it('lists the folder of a single file', async () => {
    const fetchMock = stubFetch([
      [
        /\/repository\/tree\?/,
        () => json(200, [{ path: 'design/all.tokens.json', type: 'blob' }]),
      ],
      [/\/raw\?ref=main$/, () => new Response('{"A":{}}')],
    ]);

    const files = await pullFromGitlab(
      { ...credentials, fileName: 'design/all.tokens.json' },
      'main'
    );

    expect(files).toEqual([
      { path: 'design/all.tokens.json', tokens: { A: {} } },
    ]);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('path')).toBe(
      'design'
    );
  });

  it('names a missing branch', async () => {
    stubFetch([]);

    await expect(
      pullFromGitlab({ ...credentials, fileName: '' }, 'main')
    ).rejects.toThrow('Could not find "main" in acme/frontend/tokens');
  });

  it('shows the message GitLab sends', async () => {
    stubFetch([
      [/\/repository\/tree\?/, () => json(403, { message: '403 Forbidden' })],
    ]);

    await expect(pullFromGitlab(credentials, 'main')).rejects.toThrow(
      '403 Forbidden'
    );
  });
});
