import { describe, expect, it } from 'vitest';

import {
  formatGitlabProject,
  parseGithubRepository,
  parseGitlabProject,
} from './repository';

describe('parseGithubRepository', () => {
  it.each([
    ['acme/design-tokens', 'acme', 'design-tokens', undefined],
    [
      'https://github.com/acme/design-tokens',
      'acme',
      'design-tokens',
      undefined,
    ],
    ['github.com/acme/design-tokens/', 'acme', 'design-tokens', undefined],
    [
      'https://github.com/acme/design-tokens.git',
      'acme',
      'design-tokens',
      undefined,
    ],
    [
      'git@github.com:acme/design-tokens.git',
      'acme',
      'design-tokens',
      undefined,
    ],
    [
      'https://github.com/acme/design-tokens/tree/develop',
      'acme',
      'design-tokens',
      'develop',
    ],
    [
      'https://github.com/acme/tokens/tree/feature/colors?tab=readme',
      'acme',
      'tokens',
      'feature/colors',
    ],
  ])('reads %s', (input, owner, repo, branch) => {
    expect(parseGithubRepository(input)).toEqual({
      host: 'github.com',
      owner,
      repo,
      branch,
    });
  });

  it.each(['', 'acme', 'https://github.com/acme', 'acme/design tokens'])(
    'rejects %j',
    (input) => {
      expect(parseGithubRepository(input)).toBeNull();
    }
  );
});

describe('parseGitlabProject', () => {
  it.each([
    ['acme/tokens', 'gitlab.com', 'acme', 'tokens', undefined],
    [
      'acme/frontend/design-system',
      'gitlab.com',
      'acme/frontend',
      'design-system',
      undefined,
    ],
    [
      'https://gitlab.com/acme/tokens',
      'gitlab.com',
      'acme',
      'tokens',
      undefined,
    ],
    [
      'https://gitlab.acme.com/acme/frontend/design-system/',
      'gitlab.acme.com',
      'acme/frontend',
      'design-system',
      undefined,
    ],
    [
      'gitlab.acme.com/acme/tokens',
      'gitlab.acme.com',
      'acme',
      'tokens',
      undefined,
    ],
    [
      'https://gitlab.acme.com:8443/acme/tokens.git',
      'gitlab.acme.com:8443',
      'acme',
      'tokens',
      undefined,
    ],
    [
      'git@gitlab.acme.com:acme/frontend/tokens.git',
      'gitlab.acme.com',
      'acme/frontend',
      'tokens',
      undefined,
    ],
    [
      'https://gitlab.acme.com/acme/tokens/-/tree/develop',
      'gitlab.acme.com',
      'acme',
      'tokens',
      'develop',
    ],
    [
      'https://gitlab.com/acme/tokens/-/tree/feature/colors?ref_type=heads',
      'gitlab.com',
      'acme',
      'tokens',
      'feature/colors',
    ],
    [
      'https://gitlab.com/acme/tokens/-/blob/main/design.tokens.json',
      'gitlab.com',
      'acme',
      'tokens',
      undefined,
    ],
    // a group with a dot is not a host when nothing else would be left
    ['my.group/tokens', 'gitlab.com', 'my.group', 'tokens', undefined],
  ])('reads %s', (input, host, owner, repo, branch) => {
    expect(parseGitlabProject(input)).toEqual({ host, owner, repo, branch });
  });

  it.each([
    '',
    'tokens',
    'https://gitlab.acme.com/tokens',
    'acme/design tokens',
  ])('rejects %j', (input) => {
    expect(parseGitlabProject(input)).toBeNull();
  });
});

describe('formatGitlabProject', () => {
  it('shows the stored project as the URL people paste', () => {
    expect(formatGitlabProject('', 'acme/frontend', 'tokens')).toBe(
      'https://gitlab.com/acme/frontend/tokens'
    );
    expect(
      formatGitlabProject('https://gitlab.acme.com/', 'acme', 'tokens')
    ).toBe('https://gitlab.acme.com/acme/tokens');
  });

  it('decodes an owner stored with the old %2F workaround', () => {
    expect(formatGitlabProject('', 'acme%2Ffrontend', 'tokens')).toBe(
      'https://gitlab.com/acme/frontend/tokens'
    );
  });

  it('stays empty until owner and project are set', () => {
    expect(formatGitlabProject('', '', '')).toBe('');
  });
});
