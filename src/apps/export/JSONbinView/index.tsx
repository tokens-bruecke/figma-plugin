import React, { useEffect, useState } from "react";
import styles from "./styles.module.scss";

import {
  Panel,
  PanelHeader,
  Stack,
  Button,
  Input,
  Icon,
  Text,
  Toggle,
  OverlayList,
} from "pavelLaptev/react-figma-ui/ui";

type StyleListItemType = {
  id: stylesType;
  label: string;
  icon: JSX.Element;
};

interface ViewProps {
  JSONsettingsConfig: JSONSettingsConfigI;
  setJSONsettingsConfig: React.Dispatch<
    React.SetStateAction<JSONSettingsConfigI>
  >;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
}

export const JSONbinView = (props: ViewProps) => {
  const { JSONsettingsConfig, setJSONsettingsConfig } = props;

  const [config, setConfig] = useState({
    id: "",
    name: "",
    secretKey: "",
  });

  /////////////////
  // MAIN RENDER //
  /////////////////

  return (
    <Stack hasLeftRightPadding={false} hasTopBottomPadding>
      <Stack hasLeftRightPadding={false}>
        <PanelHeader
          title="JSONbin credentials"
          isActive
          hasBackButton
          onClick={() => {
            props.setCurrentView("main");
          }}
        />
      </Stack>
      <Stack hasLeftRightPadding hasTopBottomPadding gap="var(--space-small)">
        <Stack hasTopBottomPadding>
          <Text className={styles.description}>
            To use JSONbin you need to create an account and get your secret
            key. You can do it{" "}
            <a
              href="https://jsonbin.io/"
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </a>
            .
          </Text>
        </Stack>

        <Stack gap="var(--space-extra-small)">
          <Input
            id="id"
            placeholder="Id"
            value={props.JSONsettingsConfig.servers.jsonbin.id}
            onChange={(value) => {
              setConfig((prevState) => {
                return {
                  ...prevState,
                  id: value,
                };
              });
            }}
          />
          <Input
            id="name"
            placeholder="Account Id"
            value={props.JSONsettingsConfig.servers.jsonbin.name}
            onChange={(value) => {
              setConfig((prevState) => {
                return {
                  ...prevState,
                  name: value,
                };
              });
            }}
          />
          <Input
            id="secretKey"
            placeholder="Access Key"
            value={props.JSONsettingsConfig.servers.jsonbin.secretKey}
            onChange={(value) => {
              setConfig((prevState) => {
                return {
                  ...prevState,
                  secretKey: value,
                };
              });
            }}
          />
        </Stack>

        <Stack hasTopBottomPadding>
          <Button
            label="Save"
            onClick={() => {
              setJSONsettingsConfig((prevState) => {
                return {
                  ...prevState,
                  servers: {
                    ...prevState.servers,
                    jsonbin: config,
                  },
                };
              });
            }}
          />
        </Stack>
      </Stack>
    </Stack>
  );
};
