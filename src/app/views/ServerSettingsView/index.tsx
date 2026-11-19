import React, { useEffect, useState } from 'react';
import styles from './styles.module.scss';

import {
  PanelHeader,
  Panel,
  Stack,
  Button,
  Checkbox,
  Icon,
  Text,
} from 'react-figma-ui/ui';

import { createDefaultConfig } from '@app/controller/storageConfig';

import { Field, SelectInput, TextInput } from '@app/components/Field';
import {
  providers,
  resolve,
  getServerSummary,
  FieldConfigI,
  FieldContextI,
  FormValuesT,
} from './providers';
import {
  testConnection,
  ConnectionResultI,
} from '@app/api/servers/testConnection';
import { track } from '@app/api/analytics';
import { getServerPullSource } from '@app/api/servers/pullFromServer';

// Fixed event paths, spelled like the push events
const testConnectionEventNames: Record<ServerType, string> = {
  github: 'github',
  githubPullRequest: 'github-pull-request',
  gitlab: 'gitlab',
  gitlabMergeRequest: 'gitlab-merge-request',
  jsonbin: 'jsonbin',
  customURL: 'custom-url',
};

interface ViewProps {
  JSONsettingsConfig: JSONSettingsConfigI;
  setJSONsettingsConfig: React.Dispatch<
    React.SetStateAction<JSONSettingsConfigI>
  >;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
  server: ServerType;
  showToast?: (params: ToastIPropsI) => void;
  variableCollections?: string[];
  /** The tab whose server list or + menu opened the form */
  openedFrom?: 'export' | 'import';
}

type ConnectionStateT =
  | { state: 'idle' }
  | { state: 'testing' }
  | { state: 'done'; result: ConnectionResultI };

const fieldDomId = (fieldId: string) => `server-field-${fieldId}`;

export const ServerSettingsView = (props: ViewProps) => {
  const {
    JSONsettingsConfig,
    setJSONsettingsConfig,
    setCurrentView,
    server,
    showToast,
    openedFrom = 'export',
  } = props;
  const provider = providers[server];
  const stored = (JSONsettingsConfig.servers[server] || {}) as Record<
    string,
    string | boolean
  >;
  const isConfigured = !!stored.isEnabled;

  // Any server but a PR or MR server can be pull-only: those exist to push.
  // Any server can be push-only
  const canBePullOnly =
    server !== 'githubPullRequest' && server !== 'gitlabMergeRequest';
  const isFromImport = openedFrom === 'import';
  // The form shows the restriction of the tab it was opened from: "Use for
  // pulling only" on Import, "Use for pushing only" on Export. A new server
  // added on the Import tab only pulls. Picking a server in the other tab's
  // + menu lifts its restriction, saved with Save
  const hasOnlyCheckbox = !isFromImport || canBePullOnly;
  const [isOnlyChecked, setIsOnlyChecked] = useState(() => {
    if (!hasOnlyCheckbox) return false;
    if (!isConfigured) return isFromImport;
    return isFromImport ? !!stored.pullOnly : !!stored.pushOnly;
  });
  const isPullOnly = isFromImport && canBePullOnly && isOnlyChecked;
  const isPushOnly = !isFromImport && isOnlyChecked;
  // Custom URL has no secret field, so Remove doesn't speak of one
  const secretField = provider.fields.find((field) => field.kind === 'secret');

  const [initialValues] = useState(() => provider.toForm(stored));
  const [values, setValues] = useState<FormValuesT>(initialValues);
  // The kit's Input keeps its own value; a new key remounts it when a pasted
  // URL fills another field
  const [revisions, setRevisions] = useState<Record<string, number>>({});
  const [blurred, setBlurred] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [connection, setConnection] = useState<ConnectionStateT>({
    state: 'idle',
  });
  const [isLeaving, setIsLeaving] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [focusFieldId, setFocusFieldId] = useState<string | null>(null);

  // The commit message means nothing to a server that is never pushed to
  const fields = provider.fields.filter(
    (field) => !(field.pushOnly && isPullOnly)
  );
  const advancedFields = fields.filter((field) => field.isAdvanced);
  const mainFields = fields.filter((field) => !field.isAdvanced);
  const [isMoreOpen, setIsMoreOpen] = useState(() =>
    advancedFields.some((field) => !!initialValues[field.id])
  );

  const ctx: FieldContextI = {
    values,
    splitByCollection: JSONsettingsConfig.splitByCollection,
    splitByMode: JSONsettingsConfig.splitByMode,
    collections: props.variableCollections || [],
    isPullOnly,
  };

  // JSONBin's secret is a "Master key", the others are tokens
  const secretName =
    secretField && /key/i.test(resolve(secretField.label, ctx))
      ? 'key'
      : 'token';

  const getError = (field: FieldConfigI) => {
    const value = values[field.id] || '';

    if (!value.trim()) {
      return resolve(field.required, ctx)
        ? `Enter the ${resolve(field.label, ctx).toLowerCase()}.`
        : undefined;
    }

    return field.validate?.(value, ctx);
  };

  const errors = fields.reduce((acc, field) => {
    const error = getError(field);
    return error ? { ...acc, [field.id]: error } : acc;
  }, {} as Record<string, string>);

  const connectionResult =
    connection.state === 'done' ? connection.result : undefined;

  // Required fields complain only after a save attempt; format errors as
  // soon as the user leaves a field they typed in
  const getVisibleError = (field: FieldConfigI) => {
    if (connectionResult?.fieldId === field.id) {
      return connectionResult.message;
    }

    return isSubmitted || blurred[field.id] ? errors[field.id] : undefined;
  };

  const isDirty =
    provider.fields.some(
      (field) =>
        (values[field.id] || '').trim() !==
        (initialValues[field.id] || '').trim()
    ) ||
    (isConfigured &&
      (isPullOnly !== !!stored.pullOnly || isPushOnly !== !!stored.pushOnly));

  useEffect(() => {
    if (!focusFieldId) return;

    document.getElementById(fieldDomId(focusFieldId))?.focus();
    setFocusFieldId(null);
  }, [focusFieldId, isMoreOpen]);

  //////////////////////
  // HANDLE FUNCTIONS //
  //////////////////////

  const handleChange = (fieldId: string, value: string) => {
    const nextValues = { ...values, [fieldId]: value };
    const derived = provider.derive?.(fieldId, nextValues);

    setValues({ ...nextValues, ...derived });
    setConnection({ state: 'idle' });

    if (derived) {
      setRevisions((prev) =>
        Object.keys(derived).reduce(
          (acc, id) => ({ ...acc, [id]: (acc[id] || 0) + 1 }),
          prev
        )
      );
    }
  };

  // Leaving an empty field says nothing yet; that waits for Save
  const handleBlur = (fieldId: string, value: string) => {
    if (value) {
      setBlurred((prev) => ({ ...prev, [fieldId]: true }));
    }
  };

  /** Shows every error and moves the focus to the first one */
  const checkForm = () => {
    setIsSubmitted(true);

    const firstInvalid = fields.find((field) => errors[field.id]);
    if (!firstInvalid) return true;

    if (firstInvalid.isAdvanced) {
      setIsMoreOpen(true);
    }
    setFocusFieldId(firstInvalid.id);

    return false;
  };

  const handleSave = () => {
    if (!checkForm()) {
      setIsLeaving(false);
      return;
    }

    const nextStored = {
      ...stored,
      ...provider.toStorage(values),
      isEnabled: true,
      pullOnly: isPullOnly,
      pushOnly: isPushOnly,
    };

    setJSONsettingsConfig((prevState) => ({
      ...prevState,
      servers: {
        ...prevState.servers,
        [server]: nextStored,
      },
    }));

    showToast?.({
      title: `${provider.title} saved`,
      // Every server is also where Pull on the Import tab reads from
      message: isPushOnly
        ? `Push to server sends the tokens to ${getServerSummary(
            server,
            nextStored
          )}. The Import tab doesn’t list it.`
        : isPullOnly
        ? `Pull on the Import tab reads the tokens from ${getServerPullSource(
            server,
            nextStored as ServerSettingsI[ServerType]
          )}. Push to server skips it.`
        : `Push to server sends the tokens to ${getServerSummary(
            server,
            nextStored
          )}. Pull on the Import tab reads them from ${getServerPullSource(
            server,
            nextStored as ServerSettingsI[ServerType]
          )}.`,
      options: { type: 'success' },
    });

    setCurrentView('main');
  };

  const handleTestConnection = async () => {
    if (!checkForm()) return;

    track(`/test-connection/${testConnectionEventNames[server]}`);

    setConnection({ state: 'testing' });

    const result = await testConnection(server, {
      ...stored,
      ...provider.toStorage(values),
      pullOnly: isPullOnly,
    } as unknown as ServerSettingsI[ServerType]);

    setConnection({ state: 'done', result });

    if (result.fieldId) {
      setFocusFieldId(result.fieldId);
    }
  };

  const handleBack = () => {
    // Unsaved changes are only dropped through Discard, never by a second
    // click on back
    if (isDirty) {
      setIsLeaving(true);
      return;
    }

    setCurrentView('main');
  };

  const handleRemove = () => {
    setJSONsettingsConfig((prevState) => ({
      ...prevState,
      servers: {
        ...prevState.servers,
        [server]: createDefaultConfig().profiles.default.servers[server],
      },
    }));

    showToast?.({
      title: `${provider.title} removed`,
      message: secretField
        ? `Its settings and ${secretName} are deleted from this profile.`
        : 'Its settings are deleted from this profile.',
      options: { type: 'info' },
    });

    setCurrentView('main');
  };

  ////////////////////
  // RENDER HELPERS //
  ////////////////////

  const renderField = (field: FieldConfigI) => {
    const id = fieldDomId(field.id);
    const error = getVisibleError(field);
    const hint = resolve(field.hint, ctx);

    return (
      <Field
        key={field.id}
        id={id}
        label={resolve(field.label, ctx)}
        isOptional={!resolve(field.required, ctx)}
        link={field.link?.(ctx)}
        hint={hint}
        error={error}
      >
        {field.kind === 'select' ? (
          <SelectInput
            id={id}
            value={values[field.id]}
            options={field.options || []}
            onChange={(value) => handleChange(field.id, value)}
          />
        ) : (
          <TextInput
            key={`${field.id}-${revisions[field.id] || 0}`}
            id={id}
            value={values[field.id]}
            placeholder={resolve(field.placeholder, ctx)}
            isSecret={field.kind === 'secret'}
            isInvalid={!!error}
            hasMessage={!!(error || hint)}
            onChange={(value) => handleChange(field.id, value)}
            onBlur={(value) => handleBlur(field.id, value)}
          />
        )}
      </Field>
    );
  };

  // The chevron of "Advanced settings", turned: down while collapsed, up
  // while open
  const chevronIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M14.9141 7.708L14.2061 7L9.00006 11.999L14.2061 16.9986L14.9141 16.2906L10.4141 11.999L14.9141 7.708Z"
        fill="currentColor"
        transform={isMoreOpen ? 'rotate(90 12 12)' : 'rotate(-90 12 12)'}
      />
    </svg>
  );

  const connectionStatus = connectionResult && (
    <div
      className={[
        styles.status,
        connectionResult.ok ? styles.statusSuccess : styles.statusError,
      ].join(' ')}
      role="status"
    >
      <Icon name={connectionResult.ok ? 'tick' : 'warning'} size="16" />
      <span>
        {connectionResult.ok || !connectionResult.fieldId
          ? connectionResult.message
          : 'Connection failed. Check the highlighted field.'}
      </span>
    </div>
  );

  /////////////////
  // MAIN RENDER //
  /////////////////

  return (
    <Panel hasLeftRightPadding={false} hasTopBottomPadding bottomBorder={false}>
      <Stack hasLeftRightPadding={false}>
        <PanelHeader
          title={provider.title}
          isActive
          hasBackButton
          onClick={handleBack}
        />
      </Stack>

      {/* Nested padded stacks put the content 16 px in, like the main
          view's buttons */}
      {isLeaving && (
        <Stack hasLeftRightPadding hasTopBottomPadding>
          <Stack
            direction="row"
            gap="var(--space-extra-small)"
            className={styles.rowItem}
          >
            <Text className={styles.rowItemText}>Unsaved changes</Text>
            <Button
              label="Discard"
              secondary
              onClick={() => setCurrentView('main')}
            />
            <Button label="Save" onClick={handleSave} />
          </Stack>
        </Stack>
      )}

      <Stack hasLeftRightPadding hasTopBottomPadding gap="var(--space-small)">
        <Text className={styles.description}>
          {(isPullOnly && provider.pullDescription) ||
            (isPushOnly && provider.pushDescription) ||
            provider.description}
        </Text>
        {mainFields.map(renderField)}
      </Stack>

      {hasOnlyCheckbox && (
        // Its own section: it says what the server is used for, not where
        <Stack
          hasLeftRightPadding
          hasTopBottomPadding
          className={styles.onlySection}
        >
          <div className={styles.pullOnly}>
            <Checkbox
              id="server-only"
              className={styles.pullOnlyCheckbox}
              checked={isOnlyChecked}
              onChang={(checked: boolean) => {
                setIsOnlyChecked(checked);
                setConnection({ state: 'idle' });
              }}
            >
              <Text>
                {isFromImport ? 'Use for pulling only' : 'Use for pushing only'}
              </Text>
            </Checkbox>
            <Text className={styles.pullOnlyHint}>
              {!isFromImport
                ? isPushOnly
                  ? 'The Import tab doesn’t list it.'
                  : 'The Import tab can pull from it too.'
                : isPullOnly
                ? 'Push to server skips it.'
                : server === 'jsonbin'
                ? 'Push to server updates this bin.'
                : server === 'customURL'
                ? 'Push to server sends the tokens here.'
                : 'Push to server commits to this branch.'}
            </Text>
          </div>
        </Stack>
      )}

      {advancedFields.length > 0 && (
        // A panel like "Advanced settings" in the main view
        <Panel topBorder>
          <PanelHeader
            title="More options"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            iconButtons={[
              {
                children: (
                  <Icon
                    name={isMoreOpen ? 'caret-up' : 'caret-down'}
                    size="16"
                    customIcon={chevronIcon}
                  />
                ),
                onClick: () => setIsMoreOpen(!isMoreOpen),
              },
            ]}
          />
          {isMoreOpen && (
            <Stack
              hasLeftRightPadding
              gap="var(--space-small)"
              className={styles.moreFields}
            >
              {advancedFields.map(renderField)}
            </Stack>
          )}
        </Panel>
      )}

      <Stack
        hasLeftRightPadding
        hasTopBottomPadding
        gap="var(--space-small)"
        className={styles.section}
      >
        {connectionStatus}
        <Stack direction="row" gap="var(--space-extra-small)">
          {provider.canTestConnection && (
            <Button
              label="Test connection"
              secondary
              fullWidth
              loading={connection.state === 'testing'}
              onClick={handleTestConnection}
            />
          )}
          <Button label="Save" fullWidth onClick={handleSave} />
        </Stack>
      </Stack>

      {isConfigured && (
        <Panel
          topBorder
          bottomBorder={false}
          hasLeftRightPadding
          className={styles.removeSection}
        >
          {isConfirmingRemove ? (
            <Stack
              hasLeftRightPadding
              direction="row"
              gap="var(--space-extra-small)"
              className={styles.rowItem}
            >
              <Text className={styles.rowItemText}>
                {secretField
                  ? `Also deletes the ${secretName}.`
                  : 'Deletes its settings.'}
              </Text>
              <Button
                label="Cancel"
                secondary
                onClick={() => setIsConfirmingRemove(false)}
              />
              <Button label="Remove" danger onClick={handleRemove} />
            </Stack>
          ) : (
            <Stack hasLeftRightPadding>
              <Button
                label={`Remove ${provider.title}`}
                fullWidth
                secondary
                danger
                onClick={() => setIsConfirmingRemove(true)}
              />
            </Stack>
          )}
        </Panel>
      )}
    </Panel>
  );
};
