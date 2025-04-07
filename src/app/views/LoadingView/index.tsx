import React from "react";

import styles from "./styles.module.scss";

export const LoadingView = () => {
  return (
    <section className={styles.loadingView}>
      <svg
        width="42"
        height="48"
        viewBox="0 0 42 48"
        xmlns="http://www.w3.org/2000/svg"
        fill="var(--figma-color-icon)"
        className={styles.spinner}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M41.5692 12L20.7846 0L0 12V36L20.7846 48L41.5692 36V12ZM20.7337 29.4674C23.9003 29.4674 26.4674 26.9003 26.4674 23.7337C26.4674 20.5671 23.9003 18 20.7337 18C17.5671 18 15 20.5671 15 23.7337C15 26.9003 17.5671 29.4674 20.7337 29.4674Z"
        />
      </svg>
    </section>
  );
};
