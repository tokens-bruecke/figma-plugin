import { describe, expect, it } from 'vitest';

import { getServerSummary, providers, FieldContextI } from './providers';

const ctx = (values: Record<string, string>): FieldContextI => ({
  values,
  splitByCollection: false,
  splitByMode: false,
  collections: ['Primitives'],
});

const field = (server: ServerType, id: string) =>
  providers[server].fields.find((item) => item.id === id);

describe('providers: stored settings stay compatible', () => {
  it('keeps a GitLab project in a subgroup on a self-managed host', () => {
    const stored = {
      isEnabled: true,
      host: 'gitlab.acme.com',
      owner: 'acme/frontend',
      repo: 'design-system',
      branch: 'main',
      fileName: 'tokens/design.tokens.json',
      token: 'glpat-test',
      commitMessage: '',
    };
    const form = providers.gitlab.toForm(stored);

    expect(form.project).toBe(
      'https://gitlab.acme.com/acme/frontend/design-system'
    );
    expect(providers.gitlab.toStorage(form)).toEqual({
      host: 'gitlab.acme.com',
      owner: 'acme/frontend',
      repo: 'design-system',
      branch: 'main',
      fileName: 'tokens/design.tokens.json',
      token: 'glpat-test',
      commitMessage: '',
    });
  });

  it('stores gitlab.com as an empty host, as before', () => {
    const form = providers.gitlab.toForm({ owner: 'acme', repo: 'tokens' });

    expect(providers.gitlab.toStorage(form).host).toBe('');
  });

  it('turns an owner saved with the old %2F workaround into a plain path', () => {
    const form = providers.gitlab.toForm({
      host: '',
      owner: 'acme%2Ffrontend',
      repo: 'tokens',
    });

    expect(providers.gitlab.toStorage(form)).toMatchObject({
      owner: 'acme/frontend',
      repo: 'tokens',
    });
  });

  it('splits a pasted GitHub URL into owner and repository', () => {
    const form = {
      ...providers.github.toForm({}),
      repository: 'https://github.com/acme/design-tokens',
      branch: 'main',
      token: '  github_pat_test  ',
    };

    expect(providers.github.toStorage(form)).toMatchObject({
      owner: 'acme',
      repo: 'design-tokens',
      token: 'github_pat_test',
    });
  });

  it('fills the defaults a new server needs', () => {
    expect(providers.github.toForm({}).fileName).toBe('design.tokens.json');
    expect(providers.jsonbin.toForm({}).name).toBe('design.tokens');
    expect(providers.customURL.toForm({}).method).toBe('POST');
  });
});

describe('providers: derived values', () => {
  it('takes the branch from a pasted GitLab URL into an empty branch field', () => {
    const values = {
      ...providers.gitlab.toForm({}),
      project: 'https://gitlab.acme.com/acme/tokens/-/tree/develop',
    };

    expect(providers.gitlab.derive('project', values)).toEqual({
      branch: 'develop',
    });
  });

  it('never overwrites a branch the user typed', () => {
    const values = {
      ...providers.gitlab.toForm({}),
      project: 'https://gitlab.acme.com/acme/tokens/-/tree/develop',
      branch: 'main',
    };

    expect(providers.gitlab.derive('project', values)).toBeUndefined();
  });

  it('fills the base branch of a GitHub pull request', () => {
    const values = {
      ...providers.githubPullRequest.toForm({}),
      repository: 'https://github.com/acme/tokens/tree/main',
    };

    expect(providers.githubPullRequest.derive('repository', values)).toEqual({
      baseBranch: 'main',
    });
  });
});

describe('providers: validation', () => {
  it('rejects a pull request branch that is the base branch', () => {
    const prBranch = field('githubPullRequest', 'branch');

    expect(
      prBranch.validate('main', ctx({ baseBranch: 'main', branch: 'main' }))
    ).toMatch(/different branch/);
    expect(
      prBranch.validate(
        'tokens/update',
        ctx({ baseBranch: 'main', branch: 'tokens/update' })
      )
    ).toBeUndefined();
  });

  it('asks for JSON object headers with double quotes', () => {
    const headers = field('customURL', 'headers');

    expect(headers.validate("{'Authorization': 'x'}", ctx({}))).toMatch(
      /valid JSON/
    );
    expect(headers.validate('["x"]', ctx({}))).toMatch(/JSON object/);
    expect(
      headers.validate('{"Authorization": "Bearer x"}', ctx({}))
    ).toBeUndefined();
  });

  it('wants a full http(s) URL for a custom server', () => {
    const url = field('customURL', 'url');

    expect(url.validate('api.example.com/tokens', ctx({}))).toBeDefined();
    expect(url.validate('ftp://example.com', ctx({}))).toBeDefined();
    expect(url.validate('https://api.example.com/tokens', ctx({}))).toBe(
      undefined
    );
  });
});

describe('getServerSummary', () => {
  it.each([
    [
      'github',
      { owner: 'acme', repo: 'tokens', branch: 'main' },
      'acme/tokens · main',
    ],
    [
      'githubPullRequest',
      { owner: 'acme', repo: 'tokens', baseBranch: 'main' },
      'acme/tokens · into main',
    ],
    [
      'gitlab',
      {
        host: 'gitlab.acme.com',
        owner: 'acme/web',
        repo: 'tokens',
        branch: 'main',
      },
      'acme/web/tokens · main',
    ],
    ['jsonbin', { name: 'design.tokens', id: '' }, 'design.tokens · new bin'],
    [
      'customURL',
      { url: 'https://api.example.com/tokens?x=1', method: 'PUT' },
      'PUT api.example.com/tokens',
    ],
  ])('describes %s', (server, stored, summary) => {
    expect(getServerSummary(server as ServerType, stored)).toBe(summary);
  });
});
