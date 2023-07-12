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
  server: ServerType;
}

const viewsConfig = {
  jsonbin: {
    title: "JSONbin credentials",
    description: (
      <>To use JSONbin you need to create an account and get your secret</>
    ),
    isEnabled: false,
    fields: [
      {
        id: "name",
        placeholder: "Name",
        type: "input",
        value: "",
        required: true,
      },
      {
        id: "secretKey",
        placeholder: "Access Key",
        type: "input",
        value: "",
        required: true,
      },
      {
        id: "id",
        placeholder: "Bin ID (for existing bin)",
        type: "input",
        value: "",
        required: false,
      },
    ],
  },
  github: {
    title: "Github credentials",
    description: (
      <>
        To use Github you need to create a{" "}
        <a
          href="https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token"
          target="_blank"
          rel="noopener noreferrer"
        >
          personal access token
        </a>
        .
      </>
    ),
    isEnabled: false,
    fields: [
      {
        id: "repo",
        placeholder: "Repo",
        type: "input",
        value: "",
        required: true,
      },
      {
        id: "branch",
        placeholder: "Branch",
        type: "input",
        value: "",
        required: true,
      },
      {
        id: "token",
        placeholder: "Token",
        type: "input",
        value: "",
        required: true,
      },
    ],
  },
} as ViewsConfigI;

interface LocalConfigI {
  isEnabled: boolean;
  [key: string]: string | boolean;
}

export const ServerSettingsView = (props: ViewProps) => {
  const { JSONsettingsConfig, setJSONsettingsConfig, setCurrentView } = props;
  const [errorFields, setErrorFields] = useState([] as string[]);

  const [config, setConfig] = useState(
    viewsConfig[props.server].fields.reduce((acc, field) => {
      return {
        ...acc,
        isEnabled: JSONsettingsConfig.servers[props.server]["isEnabled"],
        [field.id]: JSONsettingsConfig.servers[props.server][field.id],
      };
    }, {} as LocalConfigI)
  );

  const isFormValid = viewsConfig[props.server].fields.every((field) => {
    return config[field.id] !== "" || !field.required;
  });

  /////////////////
  // MAIN RENDER //
  /////////////////

  return (
    <Stack hasLeftRightPadding={false} hasTopBottomPadding>
      <Stack hasLeftRightPadding={false}>
        <PanelHeader
          title={viewsConfig[props.server].title}
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
            {viewsConfig[props.server].description}
          </Text>
        </Stack>

        <Stack gap="var(--space-extra-small)">
          {viewsConfig[props.server].fields.map((field) => {
            const handleErrorsOnBlur = (value: string) => {
              if (value === "" && field.required) {
                setErrorFields((prevState) => {
                  return [...prevState, field.id];
                });
              }
            };

            const clearErrorOnFocus = () => {
              setErrorFields((prevState) => {
                return prevState.filter((item) => item !== field.id);
              });
            };

            const handleChange = (value: string) => {
              setConfig((prevState) => {
                return {
                  ...prevState,
                  [field.id]: value,
                };
              });
            };

            return (
              <Input
                key={field.id}
                id={field.id}
                placeholder={field.placeholder}
                value={JSONsettingsConfig.servers[props.server][field.id] || ""}
                onChange={handleChange}
                onBlur={handleErrorsOnBlur}
                onFocus={clearErrorOnFocus}
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
            // disabled={!isFormValid}
            onClick={() => {
              // check if all fields are filled
              if (!isFormValid) {
                setErrorFields(
                  // add to array only fields that are empty
                  viewsConfig[props.server].fields.reduce((acc, field) => {
                    if (!config[field.id] && field.required) {
                      return [...acc, field.id];
                    }

                    return acc;
                  }, [] as ServerType[])
                );

                return;
              }

              setJSONsettingsConfig((prevState) => {
                return {
                  ...prevState,
                  servers: {
                    ...prevState.servers,
                    [props.server]: {
                      ...prevState.servers[props.server],
                      ...config,
                      isEnabled: true,
                    },
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

                    // reset config
                    [props.server]: viewsConfig[props.server].fields.reduce(
                      (acc, field) => {
                        return {
                          ...acc,
                          ["isEnabled"]: false,
                          [field.id]: "",
                        };
                      }
                    ),
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
