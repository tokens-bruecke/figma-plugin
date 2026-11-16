import React from 'react';
import styles from './styles.module.scss';

import { Checkbox, Panel, PanelHeader, Stack, Text } from 'react-figma-ui/ui';

interface ViewProps {
  JSONsettingsConfig: JSONSettingsConfigI;
  setJSONsettingsConfig: React.Dispatch<
    React.SetStateAction<JSONSettingsConfigI>
  >;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
  /** Collection names of the open file */
  variableCollections: string[];
}

/** The collections a Git push writes while the tokens are split. */
export const CollectionsView = ({
  JSONsettingsConfig,
  setJSONsettingsConfig,
  setCurrentView,
  variableCollections,
}: ViewProps) => {
  const excludedCollections = JSONsettingsConfig.excludedCollections ?? [];

  const setCollectionIncluded = (collection: string, isIncluded: boolean) => {
    setJSONsettingsConfig((prevState) => {
      const others = (prevState.excludedCollections ?? []).filter(
        (name) => name !== collection
      );

      return {
        ...prevState,
        excludedCollections: isIncluded ? others : [...others, collection],
      };
    });
  };

  return (
    <Panel hasLeftRightPadding={false} hasTopBottomPadding bottomBorder={false}>
      <Stack hasLeftRightPadding={false}>
        <PanelHeader
          title="Collections to push"
          isActive
          hasBackButton
          onClick={() => {
            setCurrentView('main');
          }}
        />
      </Stack>

      <Stack hasLeftRightPadding hasTopBottomPadding>
        <div className={styles.content}>
          <Text className={styles.hint}>
            Only checked collections are pushed. Files of unchecked ones stay as
            they are.
          </Text>
          <div className={styles.checkboxList}>
            {variableCollections.map((collection, index) => (
              <Checkbox
                key={collection}
                id={`push-collection-${index}`}
                checked={!excludedCollections.includes(collection)}
                onChang={(checked: boolean) =>
                  setCollectionIncluded(collection, checked)
                }
              >
                <Text>{collection}</Text>
              </Checkbox>
            ))}
          </div>
        </div>
      </Stack>
    </Panel>
  );
};
