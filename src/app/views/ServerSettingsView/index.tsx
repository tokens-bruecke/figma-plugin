import React, { useEffect, useState } from 'react';
import styles from './styles.module.scss';

import {
  PanelHeader,
  Panel,
  Stack,
  Button,
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

interface ViewProps {
  JSONsettingsConfig: JSONSettingsConfigI;
  setJSONsettingsConfig: React.Dispatch<
    React.SetStateAction<JSONSettingsConfigI>
  >;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
  server: ServerType;
  showToast?: (params: ToastIPropsI) => void;
  variableCollections?: string[];
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
  } = props;
  const provider = providers[server];
  const stored = (JSONsettingsConfig.servers[server] || {}) as Record<
    string,
    string | boolean
  >;
  const isConfigured = !!stored.isEnabled;

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

  const advancedFields = provider.fields.filter((field) => field.isAdvanced);
  const mainFields = provider.fields.filter((field) => !field.isAdvanced);
  const [isMoreOpen, setIsMoreOpen] = useState(() =>
    advancedFields.some((field) => !!initialValues[field.id])
  );

  const ctx: FieldContextI = {
    values,
    splitByCollection: JSONsettingsConfig.splitByCollection,
    splitByMode: JSONsettingsConfig.splitByMode,
    collections: props.variableCollections || [],
  };

  const getError = (field: FieldConfigI) => {
    const value = values[field.id] || '';

    if (!value.trim()) {
      return field.required
        ? `Enter the ${resolve(field.label, ctx).toLowerCase()}.`
        : undefined;
    }

    return field.validate?.(value, ctx);
  };

  const errors = provider.fields.reduce((acc, field) => {
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

  const isDirty = provider.fields.some(
    (field) =>
      (values[field.id] || '').trim() !== (initialValues[field.id] || '').trim()
  );

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

    const firstInvalid = provider.fields.find((field) => errors[field.id]);
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
      message: `Push to server sends the tokens to ${getServerSummary(
        server,
        nextStored
      )}.`,
      options: { type: 'success' },
    });

    setCurrentView('main');
  };

  const handleTestConnection = async () => {
    if (!checkForm()) return;

    setConnection({ state: 'testing' });

    const result = await testConnection(server, {
      ...stored,
      ...provider.toStorage(values),
    } as unknown as ServerSettingsI[ServerType]);

    setConnection({ state: 'done', result });

    if (result.fieldId) {
      setFocusFieldId(result.fieldId);
    }
  };

  const handleBack = () => {
    // A second click on back leaves without saving
    if (isDirty && !isLeaving) {
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
      message: 'Its settings and token are deleted from this profile.',
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
        isOptional={!field.required}
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
        <Text className={styles.description}>{provider.description}</Text>
        {mainFields.map(renderField)}
      </Stack>

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
            <Stack hasLeftRightPadding gap="var(--space-small)">
              {advancedFields.map(renderField)}
            </Stack>
          )}
        </Panel>
      )}

      <Stack hasLeftRightPadding hasTopBottomPadding gap="var(--space-small)">
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
        <Panel topBorder bottomBorder={false} hasLeftRightPadding>
          {isConfirmingRemove ? (
            <Stack
              hasLeftRightPadding
              direction="row"
              gap="var(--space-extra-small)"
              className={styles.rowItem}
            >
              <Text className={styles.rowItemText}>
                Also deletes the token.
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
