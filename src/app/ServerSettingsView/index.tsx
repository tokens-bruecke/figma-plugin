import React, { useState } from "react";
import styles from "./styles.module.scss";

import {
  PanelHeader,
  Panel,
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
      <>
        To use JSONbin you need to create{" "}
        <a href="https://jsonbin.io/" target="_blank" rel="noopener noreferrer">
          an account
        </a>{" "}
        and get your{" "}
        <a
          href="https://jsonbin.io/api-reference/access-keys/create"
          target="_blank"
          rel="noopener noreferrer"
        >
          API key
        </a>
        .
      </>
    ),
    isEnabled: false,
    fields: [
      {
        id: "name",
        placeholder: "Bin name",
        type: "input",
        value: "design.tokens",
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
        id: "token",
        placeholder: "Personal access token",
        type: "input",
        value: "",
        required: true,
      },
      {
        id: "owner",
        placeholder: "Owner",
        type: "input",
        value: "",
        required: true,
      },
      {
        id: "repo",
        placeholder: "Repo name",
        type: "input",
        value: "",
        required: true,
      },
      {
        id: "branch",
        placeholder: "Branch name",
        type: "input",
        value: "",
        required: true,
      },
      {
        id: "fileName",
        placeholder: "File name",
        type: "input",
        value: "design.tokens.json",
        required: true,
      },
      {
        id: "commitMessage",
        placeholder: "Commit message (optional)",
        type: "input",
        value: "",
        required: false,
      },
    ],
  },
  customURL: {
    title: "Custom URL",
    description: (
      <>
        To use custom URL you need to create a server that will accept POST or
        PUT requests with JSON body.
      </>
    ),
    isEnabled: false,
    fields: [
      {
        id: "url",
        placeholder: "URL",
        type: "input",
        value: "",
        required: true,
      },
      {
        id: "method",
        placeholder: "Method (POST or PUT)",
        type: "input",
        required: true,
      },
      {
        id: "headers",
        placeholder: "Headers (optional)",
        type: "input",
        value: "",
        required: false,
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

  // console.log("config state", config);

  const isFormValid = viewsConfig[props.server].fields.every((field) => {
    return config[field.id] !== "" || !field.required;
  });

  /////////////////
  // MAIN RENDER //
  /////////////////

  return (
    <Panel hasLeftRightPadding={false} hasTopBottomPadding bottomBorder={false}>
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
                console.log("not valid");
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
                console.log("prevState", prevState);

                const updatedConfig = {
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

                console.log("updatedConfig", updatedConfig);

                return updatedConfig;
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
    </Panel>
  );
};
