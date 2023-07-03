import React, { useState } from "react";
import styles from "./app.module.scss";

import {
  Panel,
  PanelHeader,
  Dropdown,
  Stack,
  Button,
  Checkbox,
  Text,
} from "pavelLaptev/react-figma-ui/ui";

const App = () => {
  const [nameTransformConfig, setNameTransformConfig] = useState({
    convention: "default",
    case: "default",
  });

  const handleShowOutput = () => {
    console.log("handleShowOutput");
  };

  // useEffect(() => {
  //   console.log("nameTransformConfig", nameTransformConfig);
  // }, [nameTransformConfig]);

  return (
    <section className={styles.wrap}>
      <Panel>
        <PanelHeader
          title="Show output"
          onClick={handleShowOutput}
          iconButtons={[
            {
              icon: "sidebar",
              onClick: handleShowOutput,
            },
          ]}
        />
      </Panel>

      <Panel>
        <PanelHeader title="Include styles" isActive />

        <Stack>
          <Stack direction="row" hasLeftRightPadding={false}>
            <Checkbox
              id="text-styles"
              onChange={() => {
                console.log("onChange");
              }}
            >
              <Text>Text</Text>
            </Checkbox>
            <Checkbox
              id="color-styles"
              onChange={() => {
                console.log("onChange");
              }}
            >
              <Text>Color</Text>
            </Checkbox>
          </Stack>
          <Stack direction="row" hasLeftRightPadding={false}>
            <Checkbox
              id="effects-styles"
              onChange={() => {
                console.log("onChange");
              }}
            >
              <Text>Effects</Text>
            </Checkbox>
            <Checkbox
              id="grids-styles"
              onChange={() => {
                console.log("onChange");
              }}
            >
              <Text>Grids</Text>
            </Checkbox>
          </Stack>
        </Stack>
      </Panel>

      <Panel>
        <PanelHeader title="Include variable features" isActive />

        <Stack>
          <Checkbox
            id="scope-feature"
            onChange={() => {
              console.log("onChange");
            }}
          >
            <Text>Scope</Text>
          </Checkbox>
          <Checkbox
            id="hide-from-publishing"
            onChange={() => {
              console.log("onChange");
            }}
          >
            <Text>Hide from publishing</Text>
          </Checkbox>
        </Stack>
      </Panel>

      <Panel>
        <PanelHeader title="Names transformation" isActive />
        <Stack hasLeftRightPadding>
          <Dropdown
            label="Case"
            value="none"
            labelFlex={3}
            onChange={(value) => {
              setNameTransformConfig({
                ...nameTransformConfig,
                case: value,
              });
            }}
            optionsSections={[
              {
                options: [
                  {
                    id: "none",
                    label: "None",
                  },
                  {
                    id: "uppercase",
                    label: "Uppercase",
                  },
                  {
                    id: "lowercase",
                    label: "lowercase",
                  },
                ],
              },
            ]}
          />
          <Dropdown
            label="Convention"
            value="none"
            labelFlex={3}
            onChange={(value) => {
              setNameTransformConfig({
                ...nameTransformConfig,
                convention: value,
              });
            }}
            optionsSections={[
              {
                options: [
                  {
                    id: "none",
                    label: "None",
                  },
                  {
                    id: "PascalCase",
                    label: "PascalCase",
                  },
                  {
                    id: "camelCase",
                    label: "camelCase",
                  },
                  {
                    id: "snake_case",
                    label: "snake_case",
                  },
                  {
                    id: "kebab-case",
                    label: "kebab-case",
                  },
                ],
              },
            ]}
          />
        </Stack>
      </Panel>
      <Panel hasLeftRightPadding>
        <Stack hasLeftRightPadding hasTopBottomPadding>
          <Button
            label="Download JSON"
            onClick={handleShowOutput}
            fullWidth
            secondary
          />
        </Stack>
      </Panel>
    </section>
  );
};

export default App;
