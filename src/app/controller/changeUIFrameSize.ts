import { config } from "./config";

export const changeUIFrameSize = (msg) => {
  if (msg.type === "resizeUIHeight") {
    figma.ui.resize(config.frameWidth, msg.height);
  }
};
