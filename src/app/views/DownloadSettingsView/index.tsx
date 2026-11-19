import React from 'react';
import styles from './styles.module.scss';

import { Panel, PanelHeader, Stack } from 'react-figma-ui/ui';
import { Field, TextInput } from '@app/components/Field';
import {
  DEFAULT_DOWNLOAD_NAME,
  getDownloadFileNames,
} from '@app/api/downloadFileName';

interface ViewProps {
  JSONsettingsConfig: JSONSettingsConfigI;
  setJSONsettingsConfig: React.Dispatch<
    React.SetStateAction<JSONSettingsConfigI>
  >;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
  /** Opens Advanced settings, whose back button returns here */
  openAdvancedSettings: () => void;
}

/** Opened from the "…" next to Download JSON */
export const DownloadSettingsView = ({
  JSONsettingsConfig,
  setJSONsettingsConfig,
  setCurrentView,
  openAdvancedSettings,
}: ViewProps) => {
  const names = getDownloadFileNames(JSONsettingsConfig.downloadFileName);
  const isSplit =
    JSONsettingsConfig.splitByCollection || JSONsettingsConfig.splitByMode;

  const setDownloadFileName = (value: string) => {
    setJSONsettingsConfig((prevState) => ({
      ...prevState,
      downloadFileName: value,
    }));
  };

  return (
    <Panel hasLeftRightPadding={false} hasTopBottomPadding bottomBorder={false}>
      <Stack hasLeftRightPadding={false}>
        <PanelHeader
          title="Download settings"
          isActive
          hasBackButton
          onClick={() => {
            setCurrentView('main');
          }}
        />
      </Stack>

      <Stack hasLeftRightPadding hasTopBottomPadding>
        <Field
          id="download-file-name"
          label="File name"
          hint={
            isSplit ? (
              <>
                Downloads as {names.zip}, because{' '}
                {JSONsettingsConfig.splitByMode ? 'modes' : 'collections'} are
                split in{' '}
                <button
                  type="button"
                  className={styles.inlineLink}
                  onClick={openAdvancedSettings}
                >
                  Advanced settings
                </button>
              </>
            ) : (
              `Downloads as ${names.json}`
            )
          }
        >
          <TextInput
            id="download-file-name"
            value={JSONsettingsConfig.downloadFileName ?? ''}
            placeholder={DEFAULT_DOWNLOAD_NAME}
            hasMessage
            onChange={setDownloadFileName}
            onBlur={setDownloadFileName}
          />
        </Field>
      </Stack>
    </Panel>
  );
};
