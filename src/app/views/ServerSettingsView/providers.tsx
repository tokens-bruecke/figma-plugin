import React from 'react';

import { splitTokensIntoFiles } from '@common/transform/splitTokensIntoFiles';

import {
  formatGithubRepository,
  formatGitlabProject,
  isDefaultGitlabHost,
  parseGithubRepository,
  parseGitlabProject,
} from '@app/api/servers/repository';

export type FormValuesT = Record<string, string>;
type StoredT = Record<string, string | boolean | undefined>;

export interface FieldContextI {
  values: FormValuesT;
  splitByCollection: boolean;
  splitByMode: boolean;
  /** Collection names of the open file, for the example paths */
  collections: string[];
}

type FromContextT<T> = T | ((ctx: FieldContextI) => T);

export interface FieldConfigI {
  id: string;
  kind: 'text' | 'secret' | 'select';
  label: FromContextT<string>;
  required?: boolean;
  /** Listed under "More options" */
  isAdvanced?: boolean;
  placeholder?: FromContextT<string>;
  hint?: FromContextT<React.ReactNode>;
  link?: (ctx: FieldContextI) => { label: string; href: string } | undefined;
  options?: { id: string; label: string }[];
  /** Format checks; an empty required field is handled by the view */
  validate?: (value: string, ctx: FieldContextI) => string | undefined;
}

export interface ProviderI {
  title: string;
  description: string;
  fields: FieldConfigI[];
  canTestConnection: boolean;
  toForm: (stored: StoredT) => FormValuesT;
  toStorage: (values: FormValuesT) => Record<string, string>;
  /** Values a pasted URL implies for other, still empty fields */
  derive?: (fieldId: string, values: FormValuesT) => FormValuesT | undefined;
}

export const resolve = <T,>(value: FromContextT<T>, ctx: FieldContextI): T =>
  typeof value === 'function'
    ? (value as (ctx: FieldContextI) => T)(ctx)
    : value;

const str = (value: unknown) => (typeof value === 'string' ? value : '');

const DEFAULT_FILE = 'design.tokens.json';
const DEFAULT_COMMIT_MESSAGE = 'Update tokens';
const DEFAULT_PR_BRANCH = 'tokens-bruecke/update-tokens';
const DEFAULT_PR_TITLE = 'chore(tokens): update tokens';

/////////////////////
// SHARED FIELDS   //
/////////////////////

const isSplit = (ctx: FieldContextI) =>
  ctx.splitByCollection || ctx.splitByMode;

// The real split logic, so the example matches what the push writes
const examplePath = (ctx: FieldContextI) => {
  const collection = ctx.collections[0] || 'Primitives';
  const [file] = splitTokensIntoFiles(
    { [collection]: {} },
    { splitByCollection: true },
    ctx.values.fileName || ''
  );

  return ctx.splitByMode
    ? file.path.replace(/\.tokens\.json$/, '/<mode>.tokens.json')
    : file.path;
};

const fileField: FieldConfigI = {
  id: 'fileName',
  kind: 'text',
  required: true,
  label: (ctx) => (isSplit(ctx) ? 'Folder' : 'File path'),
  placeholder: (ctx) => (isSplit(ctx) ? 'tokens' : DEFAULT_FILE),
  hint: (ctx) =>
    isSplit(ctx)
      ? `Split export is on: one file per ${
          ctx.splitByMode ? 'mode' : 'collection'
        }, e.g. ${examplePath(ctx)}`
      : 'Path in the repository, e.g. tokens/design.tokens.json',
};

const branchValidation = (value: string) =>
  /\s/.test(value) ? "Branch names can't contain spaces." : undefined;

const commitMessageField: FieldConfigI = {
  id: 'commitMessage',
  kind: 'text',
  isAdvanced: true,
  label: 'Commit message',
  hint: `Leave empty to use “${DEFAULT_COMMIT_MESSAGE}”.`,
};

const githubRepositoryField: FieldConfigI = {
  id: 'repository',
  kind: 'text',
  required: true,
  label: 'Repository',
  placeholder: 'owner/repository',
  hint: 'Or paste the repository URL from your browser.',
  validate: (value) =>
    parseGithubRepository(value)
      ? undefined
      : 'Use owner/repository, e.g. acme/design-tokens, or the repository URL.',
};

const githubTokenField = (permissions: string): FieldConfigI => ({
  id: 'token',
  kind: 'secret',
  required: true,
  label: 'Personal access token',
  link: () => ({
    label: 'Create token',
    href: 'https://github.com/settings/personal-access-tokens/new',
  }),
  hint: `Fine-grained token with ${permissions}: read and write.`,
});

const deriveGithubBranch =
  (branchFieldId: string) => (fieldId: string, values: FormValuesT) => {
    if (fieldId !== 'repository' || values[branchFieldId]) return undefined;

    const branch = parseGithubRepository(values.repository)?.branch;
    return branch ? { [branchFieldId]: branch } : undefined;
  };

const toGithubRepository = (values: FormValuesT) => {
  const parsed = parseGithubRepository(values.repository);
  return { owner: parsed?.owner ?? '', repo: parsed?.repo ?? '' };
};

///////////////
// PROVIDERS //
///////////////

export const providers: Record<ServerType, ProviderI> = {
  github: {
    title: 'GitHub',
    description: 'Commits the tokens straight to a branch.',
    canTestConnection: true,
    fields: [
      githubRepositoryField,
      {
        id: 'branch',
        kind: 'text',
        required: true,
        label: 'Branch',
        placeholder: 'main',
        hint: 'Must already exist.',
        validate: branchValidation,
      },
      fileField,
      githubTokenField('Contents'),
      commitMessageField,
    ],
    derive: deriveGithubBranch('branch'),
    toForm: (stored) => ({
      repository: formatGithubRepository(str(stored.owner), str(stored.repo)),
      branch: str(stored.branch),
      fileName: str(stored.fileName) || DEFAULT_FILE,
      token: str(stored.token),
      commitMessage: str(stored.commitMessage),
    }),
    toStorage: (values) => ({
      ...toGithubRepository(values),
      branch: values.branch.trim(),
      fileName: values.fileName.trim(),
      token: values.token.trim(),
      commitMessage: values.commitMessage.trim(),
    }),
  },

  githubPullRequest: {
    title: 'GitHub pull request',
    description:
      'Commits the tokens to a separate branch and opens a pull request, or updates the open one.',
    canTestConnection: true,
    fields: [
      githubRepositoryField,
      {
        id: 'baseBranch',
        kind: 'text',
        required: true,
        label: 'Base branch',
        placeholder: 'main',
        hint: 'The pull request merges into this branch.',
        validate: branchValidation,
      },
      fileField,
      githubTokenField('Contents and Pull requests'),
      {
        id: 'branch',
        kind: 'text',
        isAdvanced: true,
        label: 'Pull request branch',
        placeholder: DEFAULT_PR_BRANCH,
        hint: 'Reset to your export on every push. Use a branch nobody works on.',
        validate: (value, ctx) =>
          value.trim() && value.trim() === ctx.values.baseBranch.trim()
            ? 'Use a different branch than the base branch. This one is overwritten on every push.'
            : branchValidation(value),
      },
      commitMessageField,
      {
        id: 'pullRequestTitle',
        kind: 'text',
        isAdvanced: true,
        label: 'Pull request title',
        hint: `Leave empty to use “${DEFAULT_PR_TITLE}”.`,
      },
      {
        id: 'pullRequestBody',
        kind: 'text',
        isAdvanced: true,
        label: 'Pull request description',
      },
    ],
    derive: deriveGithubBranch('baseBranch'),
    toForm: (stored) => ({
      repository: formatGithubRepository(str(stored.owner), str(stored.repo)),
      baseBranch: str(stored.baseBranch),
      fileName: str(stored.fileName) || DEFAULT_FILE,
      token: str(stored.token),
      branch: str(stored.branch),
      commitMessage: str(stored.commitMessage),
      pullRequestTitle: str(stored.pullRequestTitle),
      pullRequestBody: str(stored.pullRequestBody),
    }),
    toStorage: (values) => ({
      ...toGithubRepository(values),
      baseBranch: values.baseBranch.trim(),
      fileName: values.fileName.trim(),
      token: values.token.trim(),
      branch: values.branch.trim(),
      commitMessage: values.commitMessage.trim(),
      pullRequestTitle: values.pullRequestTitle.trim(),
      pullRequestBody: values.pullRequestBody,
    }),
  },

  gitlab: {
    title: 'GitLab',
    description: 'Commits the tokens straight to a branch of a GitLab project.',
    canTestConnection: true,
    fields: [
      {
        id: 'project',
        kind: 'text',
        required: true,
        label: 'Project',
        placeholder: 'https://gitlab.com/group/project',
        hint: (ctx) => {
          const parsed = parseGitlabProject(ctx.values.project);

          return parsed
            ? `${parsed.host} · ${parsed.owner}/${parsed.repo}`
            : 'Paste the project URL from your browser. Self-managed GitLab works too.';
        },
        validate: (value) =>
          parseGitlabProject(value)
            ? undefined
            : 'Use the project URL or group/project, e.g. acme/design/tokens.',
      },
      {
        id: 'branch',
        kind: 'text',
        required: true,
        label: 'Branch',
        placeholder: 'main',
        hint: 'Must already exist.',
        validate: branchValidation,
      },
      fileField,
      {
        id: 'token',
        kind: 'secret',
        required: true,
        label: 'Project access token',
        link: (ctx) => {
          const parsed = parseGitlabProject(ctx.values.project);

          return {
            label: 'Create token',
            href: parsed
              ? `https://${parsed.host}/${parsed.owner}/${parsed.repo}/-/settings/access_tokens`
              : 'https://docs.gitlab.com/user/project/settings/project_access_tokens/',
          };
        },
        hint: 'Needs the api scope and a role that may push to this branch.',
      },
      commitMessageField,
    ],
    derive: (fieldId, values) => {
      if (fieldId !== 'project' || values.branch) return undefined;

      const branch = parseGitlabProject(values.project)?.branch;
      return branch ? { branch } : undefined;
    },
    toForm: (stored) => ({
      project: formatGitlabProject(
        str(stored.host),
        str(stored.owner),
        str(stored.repo)
      ),
      branch: str(stored.branch),
      fileName: str(stored.fileName) || DEFAULT_FILE,
      token: str(stored.token),
      commitMessage: str(stored.commitMessage),
    }),
    toStorage: (values) => {
      const parsed = parseGitlabProject(values.project);

      return {
        // gitlab.com stays empty, as before
        host: parsed && !isDefaultGitlabHost(parsed.host) ? parsed.host : '',
        owner: parsed?.owner ?? '',
        repo: parsed?.repo ?? '',
        branch: values.branch.trim(),
        fileName: values.fileName.trim(),
        token: values.token.trim(),
        commitMessage: values.commitMessage.trim(),
      };
    },
  },

  jsonbin: {
    title: 'JSONBin',
    description: 'Saves the tokens as a bin on jsonbin.io.',
    canTestConnection: false,
    fields: [
      {
        id: 'name',
        kind: 'text',
        required: true,
        label: 'Bin name',
        placeholder: 'design.tokens',
        hint: 'Shown in your JSONBin dashboard.',
      },
      {
        id: 'id',
        kind: 'text',
        label: 'Bin ID',
        hint: (ctx) =>
          ctx.values.id
            ? 'Every push updates this bin.'
            : 'Leave empty to create a new bin. Its ID is filled in after the first push.',
      },
      {
        id: 'secretKey',
        kind: 'secret',
        required: true,
        label: 'Master key',
        link: () => ({
          label: 'Get key',
          href: 'https://jsonbin.io/app/app/api-keys',
        }),
        hint: 'Find it under API Keys. Access keys don’t work here.',
      },
    ],
    toForm: (stored) => ({
      name: str(stored.name) || 'design.tokens',
      id: str(stored.id),
      secretKey: str(stored.secretKey),
    }),
    toStorage: (values) => ({
      name: values.name.trim(),
      id: values.id.trim(),
      secretKey: values.secretKey.trim(),
    }),
  },

  customURL: {
    title: 'Custom URL',
    description: 'Sends the tokens as JSON to your own endpoint.',
    canTestConnection: false,
    fields: [
      {
        id: 'url',
        kind: 'text',
        required: true,
        label: 'Endpoint URL',
        placeholder: 'https://api.example.com/tokens',
        validate: (value) => {
          try {
            const { protocol } = new URL(value.trim());
            return /^https?:$/.test(protocol)
              ? undefined
              : 'Use a URL that starts with https://.';
          } catch {
            return 'Enter the full URL, starting with https://.';
          }
        },
      },
      {
        id: 'method',
        kind: 'select',
        required: true,
        label: 'Method',
        options: [
          { id: 'POST', label: 'POST' },
          { id: 'PUT', label: 'PUT' },
        ],
      },
      {
        id: 'headers',
        kind: 'text',
        label: 'Headers',
        placeholder: '{"Authorization": "Bearer …"}',
        hint: 'JSON object, sent with every push.',
        validate: (value) => {
          if (!value.trim()) return undefined;

          try {
            const parsed = JSON.parse(value);
            return parsed &&
              typeof parsed === 'object' &&
              !Array.isArray(parsed)
              ? undefined
              : 'Use a JSON object, e.g. {"Authorization": "Bearer …"}.';
          } catch {
            return 'This isn’t valid JSON. Use double quotes, e.g. {"Authorization": "Bearer …"}.';
          }
        },
      },
    ],
    toForm: (stored) => ({
      url: str(stored.url),
      method: str(stored.method) || 'POST',
      headers: str(stored.headers),
    }),
    toStorage: (values) => ({
      url: values.url.trim(),
      method: values.method,
      headers: values.headers.trim(),
    }),
  },
};

/** One line that tells configured servers apart in the server list */
export const getServerSummary = (server: ServerType, stored: StoredT) => {
  const s = (key: string) => str(stored[key]);

  switch (server) {
    case 'github':
      return `${s('owner')}/${s('repo')} · ${s('branch')}`;
    case 'githubPullRequest':
      return `${s('owner')}/${s('repo')} · into ${s('baseBranch')}`;
    // The host would push project and branch out of the 300 px row; the
    // form shows it
    case 'gitlab':
      return `${s('owner')}/${s('repo')} · ${s('branch')}`;
    case 'jsonbin':
      return s('id') ? `${s('name')} · ${s('id')}` : `${s('name')} · new bin`;
    case 'customURL': {
      try {
        const url = new URL(s('url'));
        return `${s('method') || 'POST'} ${url.host}${url.pathname}`;
      } catch {
        return s('url');
      }
    }
  }
};
