import React from 'react';

import styles from './styles.module.scss';

interface StatusPictureProps {
  status: 'error';
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

export const StatusPicture = ({ status }: StatusPictureProps) => {
  return (
    <div className={styles.statusPicture}>{status === 'error' && errorSVG}</div>
  );
};
