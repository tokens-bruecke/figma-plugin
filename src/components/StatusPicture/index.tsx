import React from "react";

import styles from "./styles.module.scss";

interface StatusPictureProps {
  status: "error" | "tokens" | "import";
}

const errorSVG = (
  <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M39.9993 2L63.9986 15.856V43.568L39.9993 57.424L16 43.568V15.856L39.9993 2Z"
      stroke="var(--figma-color-border-danger-strong)"
    />
    <path
      d="M29 18.7119L51 40.7119M51 18.7119L29 40.7119"
      stroke="var(--figma-color-border-danger-strong)"
    />
  </svg>
);

const tokensSVG = (
  <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M39.9993 2L63.9986 15.856V43.568L39.9993 57.424L16 43.568V15.856L39.9993 2Z"
      stroke="#A3A3A3"
    />
    <circle cx="39.9993" cy="29.7127" r="5.73369" fill="#A3A3A3" />
  </svg>
);

const importSVG = (
  <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M16 22.784V15.856L39.9993 2L63.9986 15.856V43.568L39.9993 57.424L16 43.568V36.64"
      stroke="#A3A3A3"
    />
    <circle cx="39.9993" cy="29.7127" r="5.73369" fill="#A3A3A3" />
    <path
      d="M1 1V22.208C1 26.6263 4.58172 30.208 9 30.208H29.1524M29.1524 30.208L23.5 24.5M29.1524 30.208L23.5 35.5"
      stroke="#A3A3A3"
    />
  </svg>
);

export const StatusPicture = ({ status }: StatusPictureProps) => {
  return (
    <div className={styles.statusPicture}>
      {status === "error" && errorSVG}
      {status === "tokens" && tokensSVG}
      {status === "import" && importSVG}
    </div>
  );
};
