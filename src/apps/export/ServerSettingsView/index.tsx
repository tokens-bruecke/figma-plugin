import React, { useState } from "react";
import styles from "./styles.module.scss";

import {
  PanelHeader,
  Stack,
  Button,
  Input,
  Text,
} from "pavelLaptev/react-figma-ui/ui";

interface ViewProps {
  JSONsettingsConfig: JSONSettingsConfigI;
  setJSONsettingsConfig: React.Dispatch<
    React.SetStateAction<JSONSettingsConfigI>
  >;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
}

const fields = [
  {
    id: "name",
    placeholder: "Name",
  },
  {
    id: "secretKey",
    placeholder: "Access Key",
  },
  {
    id: "id",
    placeholder: "Bin ID (for existing bin)",
  },
];

export const ServerSettingsView = (props: ViewProps) => {
  const { JSONsettingsConfig, setJSONsettingsConfig, setCurrentView } = props;
  const [errorFields, setErrorFields] = useState([] as string[]);

  const [config, setConfig] = useState({
    isEnabled: JSONsettingsConfig.servers.jsonbin.isEnabled,
    id: JSONsettingsConfig.servers.jsonbin.id,
    name: JSONsettingsConfig.servers.jsonbin.name,
    secretKey: JSONsettingsConfig.servers.jsonbin.secretKey,
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
            setCurrentView("main");
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
          {fields.map((field) => {
            return (
              <Input
                key={field.id}
                id={field.id}
                placeholder={field.placeholder}
                value={props.JSONsettingsConfig.servers.jsonbin[field.id]}
                onChange={(value) => {
                  setConfig((prevState) => {
                    return {
                      ...prevState,
                      [field.id]: value,
                    };
                  });
                }}
                onBlur={(value) => {
                  if (value === "" && field.id !== "id") {
                    setErrorFields((prevState) => {
                      return [...prevState, field.id];
                    });
                  }
                }}
                onFocus={() => {
                  setErrorFields((prevState) => {
                    return prevState.filter((item) => item !== field.id);
                  });
                }}
                isInvalid={errorFields.includes(field.id)}
              />
            );
          })}
        </Stack>

        <Stack hasTopBottomPadding gap="var(--space-extra-small)">
          <Button
            label="Save"
            fullWidth
            secondary
            disabled={!config.name || !config.secretKey}
            onClick={() => {
              // check if all fields are filled
              const errorFields = fields.filter((field) => {
                return config[field.id] === "" && field.id !== "id";
              });

              if (errorFields.length > 0) {
                setErrorFields(errorFields.map((field) => field.id));
                return;
              }

              const newJSONBinConfig = {
                isEnabled: true,
                id: config.id,
                name: config.name,
                secretKey: config.secretKey,
              };

              setConfig(newJSONBinConfig);

              setJSONsettingsConfig((prevState) => {
                return {
                  ...prevState,
                  servers: {
                    ...prevState.servers,
                    jsonbin: newJSONBinConfig,
                  },
                };
              });

              setCurrentView("main");
            }}
          />
          <Button
            label="Remove"
            fullWidth
            secondary
            danger
            disabled={!config.isEnabled}
            onClick={() => {
              setJSONsettingsConfig((prevState) => {
                return {
                  ...prevState,
                  servers: {
                    ...prevState.servers,
                    jsonbin: {
                      isEnabled: false,
                      id: "",
                      name: "",
                      secretKey: "",
                    },
                  },
                };
              });

              setCurrentView("main");
            }}
          />
        </Stack>
      </Stack>
    </Stack>
  );
};
